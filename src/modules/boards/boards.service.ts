import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Board, BoardColumn } from './entities/board.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { CreateBoardColumnDto } from './dtos/create-board-column.dto';
import { UpdateBoardColumnDto } from './dtos/update-board-column.dto';
import { ReorderBoardColumnsDto } from './dtos/reorder-board-columns.dto';
import { BoardColumnResponseDto } from './dtos/board-column-response.dto';
import { ActivitiesService } from '@modules/activities/activities.service';
import { ACTIVITY_EVENTS } from '@modules/activities/constants/activity-events';
import { ActivityLoggedEvent } from '@modules/activities/events/activity-logged.event';
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
import { PlanLimitsService } from '@modules/subscriptions/services/plan-limits.service';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private boardRepo: Repository<Board>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private activitiesService: ActivitiesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getColumnOrFail(
    columnId: string,
    projectId?: string,
  ): Promise<BoardColumn> {
    const column = await this.boardRepo.findOne({
      where: { id: columnId },
      relations: { project: true },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isProtected: true,
        color: true,
        createdAt: true,
        project: { id: true },
      },
    });
    if (!column) throw new NotFoundException('Board column not found');
    if (projectId && column.project.id !== projectId) {
      throw new BadRequestException(
        'The board column does not belong to this project',
      );
    }
    return column;
  }

  // ─── List ────────────────────────────────────────────────────────────────

  async listColumns(projectId: string): Promise<BoardColumnResponseDto[]> {
    const projectExists = await this.projectRepo.countBy({ id: projectId });
    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

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
    await this.planLimitsService.assertCanCreateBoardColumn(projectId);

    const projectExists = await this.projectRepo.countBy({ id: projectId });
    if (!projectExists) {
      throw new NotFoundException('Project not found');
    }

    // Merge name count check & MAX(sort_order) into 1 SQL query
    const rawResult = await this.boardRepo
      .createQueryBuilder('col')
      .select('COUNT(*) FILTER (WHERE col.name = :name)', 'nameCount')
      .addSelect('MAX(col.sort_order)', 'maxOrder')
      .where('col.project_id = :projectId', { projectId })
      .setParameter('name', dto.name)
      .getRawOne<Record<string, any>>();

    const nameCount = Number(rawResult?.nameCount ?? rawResult?.namecount ?? 0);
    const maxOrder = rawResult?.maxOrder ?? rawResult?.maxorder ?? null;

    if (nameCount > 0) {
      throw new ConflictException(
        `A column named "${dto.name}" already exists in this project`,
      );
    }

    const sortOrder =
      dto.sortOrder ?? (maxOrder != null ? Number(maxOrder) + 1000 : 1000);

    const column = this.boardRepo.create({
      name: dto.name,
      sortOrder,
      isProtected: false,
      color: dto.color || '#64748b',
      project: { id: projectId } as Project,
    });

    const saved = await this.boardRepo.save(column);
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.LOGGED,
      new ActivityLoggedEvent(
        userId,
        projectId,
        `created board column: ${saved.name}`,
        'board',
        saved.id,
      ),
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
    projectId?: string,
  ): Promise<BoardColumnResponseDto> {
    const column = await this.getColumnOrFail(columnId, projectId);

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
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.LOGGED,
      new ActivityLoggedEvent(
        userId,
        column.project.id,
        `updated board column: ${saved.name}`,
        'board',
        saved.id,
      ),
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

  async deleteColumn(
    columnId: string,
    userId: string,
    projectId?: string,
  ): Promise<void> {
    const column = await this.getColumnOrFail(columnId, projectId);

    if (column.isProtected) {
      throw new BadRequestException(
        'Protected columns cannot be deleted. Unprotect the column first.',
      );
    }

    await this.boardRepo.delete({ id: columnId });
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.LOGGED,
      new ActivityLoggedEvent(
        userId,
        column.project.id,
        `deleted board column: ${column.name}`,
        'board',
        columnId,
      ),
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

    const qr = this.boardRepo.manager.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Validation fetch inside transaction
      const columns = await qr.manager.find(Board, {
        where: { id: In(columnIds), project: { id: projectId } },
      });

      if (columns.length !== columnIds.length) {
        throw new BadRequestException(
          'One or more column IDs do not belong to this project',
        );
      }

      // 2. Bulk UPDATE using single CASE WHEN statement
      const cases = dto.columns
        .map((_, i) => `WHEN $${i * 2 + 2}::uuid THEN $${i * 2 + 3}::float`)
        .join(' ');
      const params: any[] = [projectId];
      dto.columns.forEach((c) => params.push(c.id, c.sortOrder));

      await qr.query(
        `UPDATE board_columns
         SET sort_order = CASE id ${cases} END
         WHERE project_id = $1 AND id = ANY($${params.length + 1}::uuid[])`,
        [...params, columnIds],
      );

      await qr.commitTransaction();

      // 3. Update in-memory objects to return without extra SELECT query
      const sortOrderMap = new Map(
        dto.columns.map((c) => [c.id, c.sortOrder]),
      );
      columns.forEach((col) => {
        const newOrder = sortOrderMap.get(col.id);
        if (newOrder !== undefined) col.sortOrder = newOrder;
      });
      columns.sort((a, b) => a.sortOrder - b.sortOrder);

      // 4. Fire activity & realtime events post-commit
      this.eventEmitter.emit(
        ACTIVITY_EVENTS.LOGGED,
        new ActivityLoggedEvent(
          userId,
          projectId,
          'reordered board columns',
          'board',
          projectId,
        ),
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

      return columns.map((col) => this.toBoardColumnView(col));
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ─── Mapper ──────────────────────────────────────────────────────────────

  private toBoardColumnView(column: BoardColumn): BoardColumnResponseDto {
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
