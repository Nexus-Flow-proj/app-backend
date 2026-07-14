import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { SubTask } from './entities/subtask.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TimeLog } from './entities/time-log.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { Board } from '@modules/boards/entities/board.entity';
import { ProjectRole } from '@modules/projects/entities/project-role.entity';
import { ActivitiesModule } from '@modules/activities/activities.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      SubTask,
      TaskComment,
      TimeLog,
      Project,
      ProjectMember,
      User,
      Board,
      ProjectRole,
    ]),
    ActivitiesModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TypeOrmModule],
})
export class TasksModule {}
