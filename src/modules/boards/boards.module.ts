import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { Board } from './entities/board.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { ProjectRole } from '@modules/projects/entities/project-role.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { SubTask } from '@modules/tasks/entities/subtask.entity';
import { TaskComment } from '@modules/tasks/entities/task-comment.entity';
import { TimeLog } from '@modules/tasks/entities/time-log.entity';
import { ActivitiesModule } from '@modules/activities/activities.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Board,
      ProjectMember,
      ProjectRole,
      Task,
      SubTask,
      TaskComment,
      TimeLog,
    ]),
    ActivitiesModule,
  ],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [TypeOrmModule],
})
export class BoardsModule {}
