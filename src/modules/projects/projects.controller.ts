import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import {
  UpdateProjectMemberDto,
  BulkUpdateMemberRolesDto,
} from './dtos/update-project-member.dto';
import { InviteDto } from './dtos/invite.dto';
import { InviteLinkResponseDto } from './dtos/invite-link-response.dto';
import { Public } from '@shared/decorators/public.decorator';
import {
  GetInvitesQueryDto,
  PaginatedInvitesDto,
} from './dtos/get-invites.dto';
import { ProjectAuthGuard } from '../../shared/guards/project-auth.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { CurrentProjectMember } from '../../shared/decorators/current-project-member.decorator';
import { ProjectMember } from './entities/project-member.entity';
import {
  CreateProjectRoleDto,
  UpdateProjectRoleDto,
  ProjectRoleResponseDto,
} from './dtos/role.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
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
  @RequirePermission('project', 'read')
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
  @RequirePermission('project', 'updateSettings')
  @Serialize(ProjectDto)
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
    @CurrentUser() user: User,
  ): Promise<any> {
    const data = await this.projectsService.updateProject(projectId, body, user.id);
    return { message: 'Project updated successfully.', data };
  }

  @Post(':projectId/invites')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'invite')
  @Serialize(InviteLinkResponseDto)
  async inviteMember(
    @Param('projectId') projectId: string,
    @Body() body: InviteMemberDto,
    @CurrentProjectMember() actor: ProjectMember,
  ): Promise<any> {
    const data = await this.projectsService.inviteMember(
      projectId,
      body,
      actor,
    );
    return { message: 'Invite sent successfully.', data };
  }

  @Get(':projectId/invites')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'invite')
  @Serialize(PaginatedInvitesDto)
  async getProjectInvites(
    @Param('projectId') projectId: string,
    @Query() query: GetInvitesQueryDto,
  ) {
    const { page = 1, limit = 50, status } = query;

    const data = await this.projectsService.getProjectInvites(
      projectId,
      page,
      limit,
      status,
    );

    return { message: 'Invites Returned Successfully', data };
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

  @Post(':projectId/invites/:inviteId/cancel')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'invite')
  async cancelInvite(
    @Param('projectId') projectId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.projectsService.cancelInvite(projectId, inviteId, user.id);
    return { message: 'Invite cancelled successfully.' };
  }

  @Delete(':projectId/invites/:inviteId')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'remove')
  async revokeInvite(
    @Param('projectId') projectId: string,
    @Param('inviteId') inviteId: string,
  ): Promise<{ message: string }> {
    await this.projectsService.revokeInvite(projectId, inviteId);
    return { message: 'Invite revoked successfully.' };
  }

  @Get(':projectId/members')
  @UseGuards(CsrfGuard)
  @RequirePermission('project', 'read')
  @Serialize(ProjectMemberDto)
  async listMembers(@Param('projectId') projectId: string): Promise<any> {
    const data = await this.projectsService.listMembers(projectId);
    return { message: 'Project members retrieved successfully.', data };
  }

  @Patch(':projectId/members/roles')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'changeRoles')
  @Serialize(ProjectMemberDto)
  async bulkUpdateMemberRoles(
    @Param('projectId') projectId: string,
    @Body() body: BulkUpdateMemberRolesDto,
    @CurrentProjectMember() actor: ProjectMember,
  ): Promise<any> {
    const data = await this.projectsService.bulkUpdateMemberRoles(
      projectId,
      body,
      actor,
    );
    return { message: 'Member roles updated successfully.', data };
  }

  @Patch(':projectId/members/:memberId')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'changeRoles')
  @Serialize(ProjectMemberDto)
  async updateMemberRole(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateProjectMemberDto,
  ): Promise<any> {
    const data = await this.projectsService.updateMemberRole(
      projectId,
      memberId,
      body,
    );
    return { message: 'Member role updated successfully.', data };
  }

  @Delete(':projectId/members/:memberId')
  @UseGuards(CsrfGuard)
  @RequirePermission('members', 'remove')
  async removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() currentUser: User,
  ): Promise<any> {
    await this.projectsService.removeMember(
      projectId,
      memberId,
      currentUser.id,
    );
    return { message: 'Member removed successfully.' };
  }

  // ─── Project Roles CRUD ────────────────────────────────────────────────

  @Get(':projectId/roles')
  @RequirePermission('project', 'read')
  @Serialize(ProjectRoleResponseDto)
  async listRoles(@Param('projectId') projectId: string) {
    const data = await this.projectsService.listRoles(projectId);
    return { message: 'Project roles retrieved successfully.', data };
  }

  @Post(':projectId/roles')
  @UseGuards(CsrfGuard)
  @RequirePermission('roles', 'create')
  @Serialize(ProjectRoleResponseDto)
  async createRole(
    @Param('projectId') projectId: string,
    @Body() body: CreateProjectRoleDto,
    @CurrentProjectMember() actor: ProjectMember,
  ) {
    const data = await this.projectsService.createRole(projectId, body, actor);
    return { message: 'Project role created successfully.', data };
  }

  @Patch(':projectId/roles/:roleId')
  @UseGuards(CsrfGuard)
  @RequirePermission('roles', 'update')
  @Serialize(ProjectRoleResponseDto)
  async updateRole(
    @Param('projectId') projectId: string,
    @Param('roleId') roleId: string,
    @Body() body: UpdateProjectRoleDto,
    @CurrentProjectMember() actor: ProjectMember,
  ) {
    const data = await this.projectsService.updateRole(
      projectId,
      roleId,
      body,
      actor,
    );
    return { message: 'Project role updated successfully.', data };
  }

  @Delete(':projectId/roles/:roleId')
  @UseGuards(CsrfGuard)
  @RequirePermission('roles', 'delete')
  async deleteRole(
    @Param('projectId') projectId: string,
    @Param('roleId') roleId: string,
    @CurrentProjectMember() actor: ProjectMember,
  ) {
    await this.projectsService.deleteRole(projectId, roleId, actor);
    return { message: 'Project role deleted successfully.' };
  }
}
