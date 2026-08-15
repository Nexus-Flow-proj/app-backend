import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MiniWorkshop } from '../entities/mini-workshop.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { SaveMiniWorkshopDto } from '../dtos/mini-workshop/save-mini-workshop.dto';
import { MiniWorkshopResponseDto } from '../dtos/mini-workshop/mini-workshop-response.dto';
import {
  createEmptyMiniWorkshopResponse,
  toMiniWorkshopResponse,
} from '../mappers/mini-workshop.mapper';
import { MiniWorkshopValidator } from '../validators/mini-workshop.validator';

@Injectable()
export class MiniWorkshopService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MiniWorkshop)
    private readonly miniWorkshopRepo: Repository<MiniWorkshop>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly miniWorkshopValidator: MiniWorkshopValidator,
  ) {}

  async getMiniWorkshop(
    projectId: string,
    userId: string,
  ): Promise<MiniWorkshopResponseDto> {
    await this.ensureUserCanAccessProject(projectId, userId);

    const workshop = await this.miniWorkshopRepo.findOne({
      where: { projectId, ownerId: userId },
    });

    if (!workshop) {
      return createEmptyMiniWorkshopResponse(projectId, userId);
    }

    return toMiniWorkshopResponse(workshop);
  }

  async saveMiniWorkshop(
    projectId: string,
    userId: string,
    dto: SaveMiniWorkshopDto,
  ): Promise<MiniWorkshopResponseDto> {
    await this.ensureUserCanAccessProject(projectId, userId);

    // Validate complete DTO (referential integrity, image decoding, limits)
    this.miniWorkshopValidator.validateDocumentOrThrow(dto);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MiniWorkshop);
      const existing = await repo.findOne({
        where: { projectId, ownerId: userId },
      });

      if (!existing) {
        // Initial creation
        const newWorkshop = repo.create({
          projectId,
          ownerId: userId,
          schemaVersion: 2,
          revision: 1,
          scene: dto.scene as any,
        });

        const saved = await repo.save(newWorkshop);
        return toMiniWorkshopResponse(saved);
      }

      // Optimistic concurrency check
      if (existing.revision !== dto.revision) {
        throw new ConflictException({
          message:
            'The Mini Workshop was updated from another session. Reload before saving again.',
          error: 'Conflict',
          statusCode: 409,
          data: { currentRevision: existing.revision },
        });
      }

      // Atomic update incrementing revision
      const updateResult = await repo
        .createQueryBuilder()
        .update(MiniWorkshop)
        .set({
          scene: dto.scene as any,
          revision: () => 'revision + 1',
          schemaVersion: 2,
          updatedAt: new Date(),
        })
        .where('project_id = :projectId AND owner_id = :ownerId AND revision = :submittedRevision', {
          projectId,
          ownerId: userId,
          submittedRevision: dto.revision,
        })
        .execute();

      if (!updateResult.affected || updateResult.affected === 0) {
        const latest = await repo.findOne({
          where: { projectId, ownerId: userId },
        });
        throw new ConflictException({
          message:
            'The Mini Workshop was updated from another session. Reload before saving again.',
          error: 'Conflict',
          statusCode: 409,
          data: { currentRevision: latest?.revision ?? existing.revision },
        });
      }

      const updated = await repo.findOneOrFail({
        where: { projectId, ownerId: userId },
      });

      return toMiniWorkshopResponse(updated);
    });
  }

  private async ensureUserCanAccessProject(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: {
        admin: true,
        members: {
          user: true,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isProjectAdmin = project.admin?.id === userId;
    const isProjectMember = project.members?.some(
      (member) => member.user?.id === userId,
    );

    if (!isProjectAdmin && !isProjectMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }
}
