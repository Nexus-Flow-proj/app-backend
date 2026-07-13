import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Board } from './entities/board.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { CreateBoardColumnDto } from './dtos/create-board-column.dto';
import { UpdateBoardColumnDto } from './dtos/update-board-column.dto';
import { ReorderBoardColumnsDto } from './dtos/reorder-board-columns.dto';
import { BoardColumnResponseDto } from './dtos/board-column-response.dto';
import { ActivitiesService } from '@modules/activities/activities.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@modules/realtime/constants/domain-events';
import { ColumnCreatedEvent } from '@modules/realtime/domain-events/column-created.event';
import { ColumnUpdatedEvent } from '@modules/realtime/domain-events/column-updated.event';
import { ColumnDeletedEvent } from '@modules/realtime/domain-events/column-deleted.event';
import { ColumnReorderedEvent } from '@modules/realtime/domain-events/column-reordered.event';
import {
  ColumnCreatedPayload,
  ColumnUpdatedPayload,
  ColumnDeletedPayload,
  ColumnReorderedPayload,
} from '@modules/realtime/interfaces/socket-payloads.interface';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private boardRepo: Repository<Board>,
    private activitiesService: ActivitiesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getColumnOrFail(columnId: string): Promise<Board> {
    const column = await this.boardRepo.findOne({
      where: { id: columnId },
      relations: { project: true },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isProtected: true,
        createdAt: true,
        project: { id: true },
      },
    });
    if (!column) throw new NotFoundException('Board column not found');
    return column;
  }

  // ─── List ────────────────────────────────────────────────────────────────

  async listColumns(
    projectId: string,
  ): Promise<BoardColumnResponseDto[]> {
    const columns = await this.boardRepo.find({
      where: { project: { id: projectId } },
      order: { sortOrder: 'ASC' },
    });
    return columns.map((col) => this.toBoardColumnView(col));
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  async createColumn(
    projectId: string,
    dto: CreateBoardColumnDto,
    userId: string,
  ): Promise<BoardColumnResponseDto> {
    const existing = await this.boardRepo.count({
      where: { project: { id: projectId }, name: dto.name },
    });
    if (existing > 0) {
      throw new ConflictException(
        `A column named "${dto.name}" already exists in this project`,
      );
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const result = await this.boardRepo
        .createQueryBuilder('col')
        .select('MAX(col.sort_order)', 'max')
        .where('col.project_id = :projectId', { projectId })
        .getRawOne<{ max: number | null }>();
      sortOrder = result?.max != null ? result.max + 1000 : 1000;
    } else {
      const duplicate = await this.boardRepo.count({
        where: { project: { id: projectId }, sortOrder },
      });
      if (duplicate > 0) {
        throw new ConflictException(
          `A column with sort order ${sortOrder} already exists in this project. Choose a different value or omit it to auto-assign.`,
        );
      }
    }

    const column = this.boardRepo.create({
      name: dto.name,
      sortOrder,
      isProtected: false,
      color: dto.color,
      project: { id: projectId } as Project,
    });

    const saved = await this.boardRepo.save(column);
    await this.activitiesService.logActivity(
      userId,
      projectId,
      `created board column: ${saved.name}`,
      'board',
      saved.id,
    );
    const payload: ColumnCreatedPayload = {
      projectId,
      column: this.toBoardColumnView(saved),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COLUMN.CREATED,
      new ColumnCreatedEvent(payload),
    );
    return this.toBoardColumnView(saved);
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  async updateColumn(
    columnId: string,
    dto: UpdateBoardColumnDto,
    userId: string,
  ): Promise<BoardColumnResponseDto> {
    const column = await this.getColumnOrFail(columnId);

    if (dto.name && dto.name !== column.name) {
      const duplicate = await this.boardRepo.count({
        where: { project: { id: column.project.id }, name: dto.name },
      });
      if (duplicate > 0) {
        throw new ConflictException(
          `A column named "${dto.name}" already exists in this project`,
        );
      }
    }

    Object.assign(column, dto);
    const saved = await this.boardRepo.save(column);
    await this.activitiesService.logActivity(
      userId,
      column.project.id,
      `updated board column: ${saved.name}`,
      'board',
      saved.id,
    );
    const payload: ColumnUpdatedPayload = {
      projectId: column.project.id,
      column: this.toBoardColumnView(saved),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COLUMN.UPDATED,
      new ColumnUpdatedEvent(payload),
    );
    return this.toBoardColumnView(saved);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async deleteColumn(columnId: string, userId: string): Promise<void> {
    const column = await this.getColumnOrFail(columnId);

    if (column.isProtected) {
      throw new BadRequestException(
        'Protected columns cannot be deleted. Unprotect the column first.',
      );
    }

    await this.boardRepo.remove(column);
    await this.activitiesService.logActivity(
      userId,
      column.project.id,
      `deleted board column: ${column.name}`,
      'board',
      columnId,
    );
    const payload: ColumnDeletedPayload = {
      projectId: column.project.id,
      columnId,
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COLUMN.DELETED,
      new ColumnDeletedEvent(payload),
    );
  }

  // ─── Reorder ─────────────────────────────────────────────────────────────

  async reorderColumns(
    projectId: string,
    dto: ReorderBoardColumnsDto,
    userId: string,
  ): Promise<BoardColumnResponseDto[]> {
    const columnIds = dto.columns.map((c) => c.id);

    const columns = await this.boardRepo.find({
      where: { id: In(columnIds), project: { id: projectId } },
      select: { id: true },
    });

    if (columns.length !== columnIds.length) {
      throw new BadRequestException(
        'One or more column IDs do not belong to this project',
      );
    }

    await Promise.all(
      dto.columns.map((item) =>
        this.boardRepo.update(item.id, { sortOrder: item.sortOrder }),
      ),
    );

    await this.activitiesService.logActivity(
      userId,
      projectId,
      'reordered board columns',
      'board',
      projectId,
    );
    const payload: ColumnReorderedPayload = {
      projectId,
      columns: dto.columns.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      })),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COLUMN.REORDERED,
      new ColumnReorderedEvent(payload),
    );

    const updated = await this.boardRepo.find({
      where: { project: { id: projectId } },
      order: { sortOrder: 'ASC' },
    });
    return updated.map((col) => this.toBoardColumnView(col));
  }

  // ─── Mapper ──────────────────────────────────────────────────────────────

  private toBoardColumnView(column: Board): BoardColumnResponseDto {
    return {
      id: column.id,
      name: column.name,
      sortOrder: column.sortOrder,
      isProtected: column.isProtected,
      color: column.color,
      createdAt: column.createdAt,
    };
  }
}
