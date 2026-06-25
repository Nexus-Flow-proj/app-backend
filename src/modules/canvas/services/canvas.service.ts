import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Canvas } from '../entities/canvas.entity';
import { Project } from '../../projects/entities/project.entity';
import { CanvasType } from '../enums/canvas-type.enum';
import { toCanvasResponse } from '../mappers/canvas.mapper';
import { UpdateCanvasViewportDto } from '../dtos/canvas/update-canvas-viewport.dto';
import { CanvasResponseDto } from './../dtos/canvas/canvas-response.dto';
import { CanvasObject } from '../entities/canvas-object.entity';
import { CanvasObjectResponseDto } from '../dtos/object/canvas-object-response.dto';
import {
  toCanvasObjectResponse,
  toCanvasObjectResponseList,
} from '../mappers/canvas-object.mapper';
import { CreateCanvasObjectDto } from '../dtos/object/create-canvas-object.dto';
import { UpdateCanvasObjectDto } from '../dtos/object/update-canvas-object.dto';
import { Task } from '@modules/tasks/entities/task.entity';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private readonly canvasRepo: Repository<Canvas>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(CanvasObject)
    private readonly canvasObjectRepo: Repository<CanvasObject>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  // Canvas Endpoints
  async getProjectCanvas(
    projectId: string,
    userId: string,
  ): Promise<CanvasResponseDto> {
    const project = await this.findProjectAndEnsureUserCanAccess(
      projectId,
      userId,
    );

    const canvas = await this.findOrCreateCanvas({
      project,
      ownerId: project.admin!.id,
      type: CanvasType.PROJECT,
      name: 'Project Canvas',
    });

    return toCanvasResponse(canvas);
  }

  async getMyCanvas(
    projectId: string,
    userId: string,
  ): Promise<CanvasResponseDto> {
    const project = await this.findProjectAndEnsureUserCanAccess(
      projectId,
      userId,
    );

    const canvas = await this.findOrCreateCanvas({
      project,
      ownerId: userId,
      type: CanvasType.PERSONAL,
      name: 'My Canvas',
    });

    return toCanvasResponse(canvas);
  }

  async updateCanvasViewport(
    canvasId: string,
    userId: string,
    dto: UpdateCanvasViewportDto,
  ): Promise<CanvasResponseDto> {
    const canvas = await this.findCanvasAndEnsureUserCanAccess(
      canvasId,
      userId,
    );

    canvas.viewportX = dto.viewportX;
    canvas.viewportY = dto.viewportY;
    canvas.viewportZoom = dto.viewportZoom;

    const savedCanvas = await this.canvasRepo.save(canvas);

    const canvasWithOwner = await this.canvasRepo.findOneOrFail({
      where: { id: savedCanvas.id },
      relations: {
        owner: true,
      },
    });

    return toCanvasResponse(canvasWithOwner);
  }

  // Object Endpoints
  async getCanvasObjects(
    canvasId: string,
    userId: string,
  ): Promise<CanvasObjectResponseDto[]> {
    await this.findCanvasAndEnsureUserCanAccess(canvasId, userId);

    const objects = await this.canvasObjectRepo.find({
      where: { canvasId },
      order: {
        zIndex: 'ASC',
        createdAt: 'ASC',
      },
    });

    return toCanvasObjectResponseList(objects);
  }

  async createCanvasObject(
    canvasId: string,
    userId: string,
    dto: CreateCanvasObjectDto,
  ): Promise<CanvasObjectResponseDto> {
    const canvas = await this.findCanvasAndEnsureUserCanAccess(
      canvasId,
      userId,
    );

    let taskId: string | null = null;

    if (dto.type === CanvasObjectType.TASK) {
      if (!dto.taskId) {
        throw new BadRequestException('taskId is required for TASK objects');
      }

      const task = await this.taskRepo.findOne({
        where: {
          id: dto.taskId,
        },
        relations: {
            project: true,
          },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (task.project.id !== canvas.projectId) {
        throw new ForbiddenException(
          'Task does not belong to this canvas project',
        );
      }

      taskId = task.id;
    }

    if (dto.type !== CanvasObjectType.TASK && dto.taskId) {
      throw new BadRequestException(
        'taskId can only be provided for TASK objects',
      );
    }

    const object = this.canvasObjectRepo.create({
      canvasId,
      taskId,
      type: dto.type,
      x: dto.x,
      y: dto.y,
      width: dto.width ?? 200,
      height: dto.height ?? 120,
      zIndex: dto.zIndex ?? 0,
      data: dto.data ?? null,
    });

    const savedObject = await this.canvasObjectRepo.save(object);

    return toCanvasObjectResponse(savedObject);
  }

  async updateCanvasObject(
    objectId: string,
    userId: string,
    dto: UpdateCanvasObjectDto,
  ): Promise<CanvasObjectResponseDto> {
    const object = await this.canvasObjectRepo.findOne({
      where: { id: objectId },
    });

    if (!object) {
      throw new NotFoundException('Canvas object not found');
    }

    await this.findCanvasAndEnsureUserCanAccess(object.canvasId, userId);

    this.applyCanvasObjectUpdates(object, dto);

    const savedObject = await this.canvasObjectRepo.save(object);

    return toCanvasObjectResponse(savedObject);
  }

  async deleteCanvasObject(
    objectId: string,
    userId: string,
  ): Promise<{ deleted: true }> {
    const object = await this.canvasObjectRepo.findOne({
      where: { id: objectId },
    });

    if (!object) {
      throw new NotFoundException('Canvas object not found');
    }

    await this.findCanvasAndEnsureUserCanAccess(object.canvasId, userId);

    await this.canvasObjectRepo.remove(object);

    return { deleted: true };
  }

  private async findProjectAndEnsureUserCanAccess(
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

    if (!project.admin) {
      throw new InternalServerErrorException('Project admin is missing');
    }

    const isProjectAdmin = project.admin.id === userId;

    const isProjectMember = project.members.some(
      (member) => member.user.id === userId,
    );

    if (!isProjectAdmin && !isProjectMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  private async findOrCreateCanvas(params: {
    project: Project;
    ownerId: string;
    type: CanvasType;
    name: string;
  }): Promise<Canvas> {
    let canvas = await this.canvasRepo.findOne({
      where: {
        projectId: params.project.id,
        ownerId: params.ownerId,
        type: params.type,
      },
    });

    if (!canvas) {
      canvas = this.canvasRepo.create({
        projectId: params.project.id,
        ownerId: params.ownerId,
        type: params.type,
        name: params.name,
      });

      await this.canvasRepo.save(canvas);
    }

    return this.canvasRepo.findOneOrFail({
      where: {
        projectId: params.project.id,
        ownerId: params.ownerId,
        type: params.type,
      },
      relations: {
        owner: true,
      },
    });
  }

  private async findCanvasAndEnsureUserCanAccess(
    canvasId: string,
    userId: string,
  ): Promise<Canvas> {
    const canvas = await this.canvasRepo.findOne({
      where: { id: canvasId },
      relations: {
        project: {
          admin: true,
          members: {
            user: true,
          },
        },
        owner: true,
      },
    });

    if (!canvas) {
      throw new NotFoundException('Canvas not found');
    }

    if (!canvas.project.admin) {
      throw new InternalServerErrorException('Project admin is missing');
    }

    const isProjectAdmin = canvas.project.admin.id === userId;

    const isProjectMember = canvas.project.members.some(
      (member) => member.user.id === userId,
    );

    if (!isProjectAdmin && !isProjectMember) {
      throw new ForbiddenException('You do not have access to this canvas');
    }

    if (canvas.type === CanvasType.PERSONAL && canvas.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this personal canvas',
      );
    }

    return canvas;
  }

  private applyCanvasObjectUpdates(
    object: CanvasObject,
    dto: UpdateCanvasObjectDto,
  ): void {
    const allowedUpdates: Partial<CanvasObject> = {
      x: dto.x,
      y: dto.y,
      width: dto.width,
      height: dto.height,
      zIndex: dto.zIndex,
      data: dto.data,
    };

    Object.entries(allowedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        object[key as keyof CanvasObject] = value as never;
      }
    });
  }
}
