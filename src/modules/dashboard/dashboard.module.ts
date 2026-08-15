import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '@modules/tasks/entities/task.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { ActivityLog } from '@modules/activities/entities/activity-log.entity';
import { User } from '@modules/users/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ActivitiesModule } from '@modules/activities/activities.module';
import { TasksModule } from '@modules/tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, ProjectMember, ActivityLog, User]),
    ActivitiesModule,
    TasksModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
