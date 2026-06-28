import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Board } from './entities/board.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { CreateBoardColumnDto } from './dtos/create-board-column.dto';
import { UpdateBoardColumnDto } from './dtos/update-board-column.dto';
import { ReorderBoardColumnsDto } from './dtos/reorder-board-columns.dto';
import { BoardColumnResponseDto } from './dtos/board-column-response.dto';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board)
    private boardRepo: Repository<Board>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
  ) {}

  // ─── Access Control ──────────────────────────────────────────────────────

  private async checkProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const count = await this.projectMemberRepo.count({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (count === 0) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

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
    userId: string,
  ): Promise<BoardColumnResponseDto[]> {
    await this.checkProjectAccess(projectId, userId);
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
    await this.checkProjectAccess(projectId, userId);

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
      const last = await this.boardRepo.findOne({
        where: { project: { id: projectId } },
        order: { sortOrder: 'DESC' },
        select: { sortOrder: true },
      });
      sortOrder = last ? last.sortOrder + 1000 : 1000;
    }

    const column = this.boardRepo.create({
      name: dto.name,
      sortOrder,
      isProtected: false,
      color: dto.color,
      project: { id: projectId } as Project,
    });

    const saved = await this.boardRepo.save(column);
    return this.toBoardColumnView(saved);
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  async updateColumn(
    columnId: string,
    dto: UpdateBoardColumnDto,
    userId: string,
  ): Promise<BoardColumnResponseDto> {
    const column = await this.getColumnOrFail(columnId);
    await this.checkProjectAccess(column.project.id, userId);

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
    return this.toBoardColumnView(saved);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async deleteColumn(columnId: string, userId: string): Promise<void> {
    const column = await this.getColumnOrFail(columnId);
    await this.checkProjectAccess(column.project.id, userId);

    if (column.isProtected) {
      throw new BadRequestException(
        'Protected columns cannot be deleted. Unprotect the column first.',
      );
    }

    await this.boardRepo.remove(column);
  }

  // ─── Reorder ─────────────────────────────────────────────────────────────

  async reorderColumns(
    projectId: string,
    dto: ReorderBoardColumnsDto,
    userId: string,
  ): Promise<BoardColumnResponseDto[]> {
    await this.checkProjectAccess(projectId, userId);

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
