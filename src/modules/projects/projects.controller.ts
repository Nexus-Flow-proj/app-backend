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
import { ProjectMemberDto } from './dtos/project-member.dto';
import { UpdateProjectMemberDto } from './dtos/update-project-member.dto';
import { InviteDto } from './dtos/invite.dto';
import { InviteLinkResponseDto } from './dtos/invite-link-response.dto';
import { Public } from '@shared/decorators/public.decorator';

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
    const data = await this.projectsService.create(body, user.id);
    return { message: 'Project created successfully.', data };
  }

  @Get()
  @UseGuards(CsrfGuard)
  @Serialize(ProjectDto)
  async getMyProjects(@CurrentUser() user: User): Promise<any> {
    const data = await this.projectsService.getMyProjects(user.id);
    return { message: 'Projects retrieved successfully.', data };
  }

  @Get(':projectId')
  @UseGuards(CsrfGuard)
  @Serialize(ProjectDto)
  async getProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const data = await this.projectsService.getProject(projectId, user.id);
    return { message: 'Project retrieved successfully.', data };
  }

  @Patch(':projectId')
  @UseGuards(CsrfGuard)
  @Serialize(ProjectDto)
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const data = await this.projectsService.updateProject(
      projectId,
      body,
      user.id,
    );
    return { message: 'Project updated successfully.', data };
  }

  @Post(':projectId/invites')
  @UseGuards(CsrfGuard)
  @Serialize(InviteLinkResponseDto)
  async inviteMember(
    @Param('projectId') projectId: string,
    @Body() body: InviteMemberDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const data = await this.projectsService.inviteMember(
      projectId,
      body,
      user.id,
    );
    return { message: 'Invite sent successfully.', data };
  }

  @Public()
  @Get('invites/:token')
  @UseGuards(CsrfGuard)
  @Serialize(InviteDto)
  async getInvite(@Param('token') token: string) {
    const data = await this.projectsService.getInvite(token);
    return { message: 'Invite retrieved successfully.', data };
  }

  @Post('invites/:token/accept')
  @UseGuards(CsrfGuard)
  @Serialize(ProjectMemberDto)
  async acceptInvite(
    @Param('token') token: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const data = await this.projectsService.acceptInvite(token, user.id);
    return { message: 'Invite accepted successfully.', data };
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
  @UseGuards(CsrfGuard)
  @Serialize(ProjectMemberDto)
  async listMembers(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ): Promise<any> {
    const data = await this.projectsService.listMembers(projectId, user.id);
    return { message: 'Project members retrieved successfully.', data };
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
    const data = await this.projectsService.updateMemberRole(
      projectId,
      memberId,
      body,
      user.id,
    );
    return { message: 'Member role updated successfully.', data };
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
