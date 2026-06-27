import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Invite } from './entities/invite.entity';
import { User } from '../users/entities/user.entity';
import { MailModule } from '../../shared/providers/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, Invite, User]),
    MailModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
