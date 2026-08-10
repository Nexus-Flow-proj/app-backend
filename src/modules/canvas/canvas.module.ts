import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from './entities/workshop.entity';
import { WorkshopObject } from './entities/workshop-object.entity';
import { WorkshopConnection } from './entities/workshop-connection.entity';
import { MiniWorkshop } from './entities/mini-workshop.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { OnboardingDraft } from '@modules/projects/entities/onboarding-draft.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { Board } from '@modules/boards/entities/board.entity';
import { WorkshopCanvasController } from './controllers/workshop-canvas.controller';
import { WorkshopCanvasService } from './services/workshop-canvas.service';
import { WorkshopCanvasValidator } from './validators/workshop-canvas.validator';
import { MiniWorkshopController } from './controllers/mini-workshop.controller';
import { MiniWorkshopService } from './services/mini-workshop.service';
import { MiniWorkshopValidator } from './validators/mini-workshop.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workshop,
      WorkshopObject,
      WorkshopConnection,
      MiniWorkshop,
      Project,
      ProjectMember,
      OnboardingDraft,
      Task,
      Board,
    ]),
  ],
  controllers: [WorkshopCanvasController, MiniWorkshopController],
  providers: [
    WorkshopCanvasService,
    WorkshopCanvasValidator,
    MiniWorkshopService,
    MiniWorkshopValidator,
  ],
  exports: [WorkshopCanvasService, MiniWorkshopService],
})
export class CanvasModule {}
