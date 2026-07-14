import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Invite } from './entities/invite.entity';
import { ProjectRole } from './entities/project-role.entity';
import { User } from '../users/entities/user.entity';
import { MailModule } from '../../shared/providers/mail/mail.module';
import { Task } from '../tasks/entities/task.entity';
import { Board } from '../boards/entities/board.entity';
import { SubTask } from '../tasks/entities/subtask.entity';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { TimeLog } from '../tasks/entities/time-log.entity';
import { ActivitiesModule } from '@modules/activities/activities.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      Invite,
      ProjectRole,
      User,
      Task,
      Board,
      SubTask,
      TaskComment,
      TimeLog,
    ]),
    MailModule,
    ActivitiesModule,
    NotificationsModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
