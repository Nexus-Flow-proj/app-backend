import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateProjectDto } from './dtos/create-project.dto';
import { Serialize } from '../../shared/interceptors/serialize.interceptor';
import { ProjectDto } from './dtos/project.dto';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CsrfGuard } from '../../shared/guards/csrf.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { InviteMemberDto } from './dtos/invite-member.dto';
import { InviteCreatedDto } from './dtos/invite-created.dto';
import { ProjectMemberDto } from './dtos/project-member.dto';
import { UpdateProjectMemberDto } from './dtos/update-project-member.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @UseGuards(CsrfGuard)
  @Serialize(ProjectDto)
  async createProject(
    @Body() body: CreateProjectDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const project: any = await this.projectsService.create(body, user.id);
    return project;
  }

  @Get()
  @Serialize(ProjectDto)
  async getMyProjects(@CurrentUser() user: User): Promise<any> {
    const projects: any = await this.projectsService.getMyProjects(user.id);
    return projects;
  }

  @Get(':projectId')
  @Serialize(ProjectDto)
  async getProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const project: any = await this.projectsService.getProject(
      projectId,
      user.id,
    );
    return project;
  }

  @Patch(':projectId')
  @UseGuards(CsrfGuard)
  @Serialize(ProjectDto)
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const project: any = await this.projectsService.updateProject(
      projectId,
      body,
      user.id,
    );
    return project;
  }

  @Post(':projectId/invites')
  @UseGuards(CsrfGuard)
  @Serialize(InviteCreatedDto)
  async inviteMember(
    @Param('projectId') projectId: string,
    @Body() body: InviteMemberDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const invite: any = await this.projectsService.inviteMember(
      projectId,
      body,
      user.id,
    );
    return invite;
  }

  @Post('invites/:token/accept')
  @UseGuards(CsrfGuard)
  @Serialize(ProjectMemberDto)
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const member: any = await this.projectsService.acceptInvite(token, user.id);
    return member;
  }

  @Post('invites/:token/decline')
  @UseGuards(CsrfGuard)
  async declineInvite(
    @Param('token') token: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.projectsService.declineInvite(token, user.id);
    return { message: 'Invite declined successfully.' };
  }

  @Get(':projectId/members')
  @Serialize(ProjectMemberDto)
  async listMembers(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const members: any = await this.projectsService.listMembers(
      projectId,
      user.id,
    );
    return members;
  }

  @Patch(':projectId/members/:memberId')
  @UseGuards(CsrfGuard)
  @Serialize(ProjectMemberDto)
  async updateMemberRole(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateProjectMemberDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const member: any = await this.projectsService.updateMemberRole(
      projectId,
      memberId,
      body,
      user.id,
    );
    return member;
  }

  @Delete(':projectId/members/:memberId')
  @UseGuards(CsrfGuard)
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    await this.projectsService.removeMember(projectId, memberId, user.id);
    return { message: 'Member removed successfully.' };
  }
}
