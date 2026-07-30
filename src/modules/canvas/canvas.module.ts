import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Canvas } from './entities/canvas.entity';
import { CanvasObject } from './entities/canvas-object.entity';
import { CanvasConnection } from './entities/canvas-connection.entity';
import { Workshop } from './entities/workshop.entity';
import { WorkshopObject } from './entities/workshop-object.entity';
import { WorkshopConnection } from './entities/workshop-connection.entity';
import { CanvasController } from './controllers/canvas.controller';
import { CanvasService } from './services/canvas.service';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { OnboardingDraft } from '@modules/projects/entities/onboarding-draft.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { Board } from '@modules/boards/entities/board.entity';
import { WorkshopCanvasController } from './controllers/workshop-canvas.controller';
import { WorkshopCanvasService } from './services/workshop-canvas.service';
import { WorkshopCanvasValidator } from './validators/workshop-canvas.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Canvas,
      CanvasObject,
      CanvasConnection,
      Workshop,
      WorkshopObject,
      WorkshopConnection,
      Project,
      ProjectMember,
      OnboardingDraft,
      Task,
      Board,
    ]),
  ],
  controllers: [CanvasController, WorkshopCanvasController],
  providers: [CanvasService, WorkshopCanvasService, WorkshopCanvasValidator],
  exports: [CanvasService, WorkshopCanvasService],
})
export class CanvasModule {}
