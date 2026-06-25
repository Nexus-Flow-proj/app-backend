import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Canvas } from './entities/canvas.entity';
import { CanvasObject } from './entities/canvas-object.entity';
import { CanvasConnection } from './entities/canvas-connection.entity';
import { CanvasController } from './controllers/canvas.controller';
import { CanvasService } from './services/canvas.service';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { Task } from '@modules/tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Canvas,
      CanvasObject,
      CanvasConnection,
      Project,
      ProjectMember,
      Task
    ]),
  ],
  controllers: [CanvasController],
  providers: [CanvasService],
  exports: [CanvasService],
})
export class CanvasModule {}