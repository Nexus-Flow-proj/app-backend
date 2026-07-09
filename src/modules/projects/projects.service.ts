import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Repository, In } from 'typeorm';
import { CreateProjectDto } from './dtos/create-project.dto';
import { User } from '../users/entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Invite } from './entities/invite.entity';
import { ProjectRole as ProjectRoleEntity } from './entities/project-role.entity';
import crypto from 'crypto';
import { ProjectStatus } from './enums/project-status.enum';
import { ProjectRole as ProjectRoleEnum } from './enums/project-role.enum';
import { InviteStatus } from './enums/invite-status.enum';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { InviteMemberDto } from './dtos/invite-member.dto';
import {
  UpdateProjectMemberDto,
  BulkUpdateMemberRolesDto,
} from './dtos/update-project-member.dto';
import { ProjectDto } from './dtos/project.dto';
import { InviteDto } from './dtos/invite.dto';
import { ProjectMemberDto } from './dtos/project-member.dto';
import { MailService } from '../../shared/providers/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateProjectRoleDto,
  UpdateProjectRoleDto,
  ProjectRoleResponseDto,
} from './dtos/role.dto';
import { ProjectAuthEvaluator } from './utils/project-auth.evaluator';
import { ActivitiesService } from '@modules/activities/activities.service';

export const DEFAULT_ROLE_PRESETS = [
  {
    name: 'Admin',
    level: 100,
    description: 'Full permissions',
    isSystemRole: true,
    permissions: {
      project: { read: true, updateSettings: true, deleteProject: true },
      members: { invite: true, remove: true, changeRoles: true },
      tasks: {
        create: true,
        read: true,
        update: true,
        delete: true,
        assign: true,
      },
      workshop: {
        read: true,
        createNodes: true,
        updateNodes: true,
        deleteNodes: true,
        generateWithAi: true,
      },
      board: { read: true, moveTasks: true, manageColumns: true },
      roles: { create: true, update: true, delete: true },
    },
  },
  {
    name: 'Project Manager',
    level: 80,
    description: 'Manage members, tasks, and boards',
    isSystemRole: true,
    permissions: {
      project: { read: true, updateSettings: false, deleteProject: false },
      members: { invite: true, remove: true, changeRoles: true },
      tasks: {
        create: true,
        read: true,
        update: true,
        delete: true,
        assign: true,
      },
      workshop: {
        read: true,
        createNodes: true,
        updateNodes: true,
        deleteNodes: true,
        generateWithAi: true,
      },
      board: { read: true, moveTasks: true, manageColumns: true },
      roles: { create: true, update: true, delete: true },
    },
  },
  {
    name: 'Team Lead',
    level: 60,
    description: 'Manage tasks and edit lower-level work',
    isSystemRole: true,
    permissions: {
      project: { read: true, updateSettings: false, deleteProject: false },
      members: { invite: true, remove: false, changeRoles: false },
      tasks: {
        create: true,
        read: true,
        update: true,
        delete: true,
        assign: true,
      },
      workshop: {
        read: true,
        createNodes: true,
        updateNodes: true,
        deleteNodes: true,
        generateWithAi: false,
      },
      board: { read: true, moveTasks: true, manageColumns: false },
      roles: { create: false, update: false, delete: false },
    },
  },
  {
    name: 'Member',
    level: 40,
    description: 'Create and update own tasks',
    isSystemRole: false,
    permissions: {
      project: { read: true, updateSettings: false, deleteProject: false },
      members: { invite: false, remove: false, changeRoles: false },
      tasks: {
        create: true,
        read: true,
        update: true,
        delete: false,
        assign: true,
      },
      workshop: {
        read: true,
        createNodes: true,
        updateNodes: true,
        deleteNodes: false,
        generateWithAi: false,
      },
      board: { read: true, moveTasks: true, manageColumns: false },
      roles: { create: false, update: false, delete: false },
    },
  },
  {
    name: 'Viewer',
    level: 20,
    description: 'Read-only access',
    isSystemRole: false,
    permissions: {
      project: { read: true, updateSettings: false, deleteProject: false },
      members: { invite: false, remove: false, changeRoles: false },
      tasks: {
        create: false,
        read: true,
        update: false,
        delete: false,
        assign: false,
      },
      workshop: {
        read: true,
        createNodes: false,
        updateNodes: false,
        deleteNodes: false,
        generateWithAi: false,
      },
      board: { read: true, moveTasks: false, manageColumns: false },
      roles: { create: false, update: false, delete: false },
    },
  },
] as const;

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Invite) private inviteRepo: Repository<Invite>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ProjectRoleEntity)
    private projectRoleRepo: Repository<ProjectRoleEntity>,
    private mailService: MailService,
    private configService: ConfigService,
    private activitiesService: ActivitiesService,
  ) {}

  async create(body: CreateProjectDto, userId: string): Promise<ProjectDto> {
    const owner = await this.userRepo.findOne({ where: { id: userId } });
    if (!owner) {
      throw new UnauthorizedException('User not found');
    }

    const projectDto = await this.projectRepo.manager.transaction(
      async (manager) => {
        const project = manager.create(Project, {
          name: body.name,
          description: body.description ?? null,
          deadline: body.deadline ? new Date(body.deadline) : null,
          status: body.status ?? ProjectStatus.ACTIVE,
          color: body.color,
          admin: owner,
        });

        const savedProject = await manager.save(Project, project);

        const rolesToCreate = DEFAULT_ROLE_PRESETS.map((preset) =>
          manager.create(ProjectRoleEntity, {
            ...preset,
            project: savedProject,
          }),
        );
        const savedRoles = await manager.save(ProjectRoleEntity, rolesToCreate);
        const adminRole = savedRoles.find((role) => role.level === 100);

        if (!adminRole) {
          throw new NotFoundException(
            'Default admin role could not be created',
          );
        }

        await manager.save(
          manager.create(ProjectMember, {
            project: savedProject,
            user: owner,
            role: adminRole,
          }),
        );

        const createdMember = await manager.findOne(ProjectMember, {
          where: { project: { id: savedProject.id }, user: { id: owner.id } },
          relations: { project: true, user: true, role: true },
        });

        return {
          dto: this.toProjectView(
            savedProject,
            1,
            owner.id,
            createdMember ?? undefined,
          ),
          projectId: savedProject.id,
          projectName: savedProject.name,
        };
      },
    );

    // Log activity OUTSIDE the transaction to avoid cross-connection deadlocks
    await this.activitiesService.logActivity(
      userId,
      projectDto.projectId,
      `created project: ${projectDto.projectName}`,
      'project',
      projectDto.projectId,
    );

    return projectDto.dto;
  }

  async getMyProjects(userId: string): Promise<ProjectDto[]> {
    const projects = await this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.admin', 'admin')
      .leftJoinAndSelect('project.members', 'member')
      .leftJoinAndSelect('member.user', 'memberUser')
      .leftJoinAndSelect('member.role', 'memberRole')
      .where('admin.id = :userId', { userId })
      .orWhere(
        'project.id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = :userId)',
        { userId },
      )
      .orderBy('project.created_at', 'DESC')
      .getMany();

    return projects.map((project) => {
      const currentMember = project.members?.find((m) => m.user?.id === userId);
      return this.toProjectView(
        project,
        project.members?.length ?? 0,
        project.admin?.id ?? null,
        currentMember,
      );
    });
  }

  async getProject(projectId: string, userId?: string): Promise<ProjectDto> {
    const project = await this.loadProjectOrFail(projectId);
    const currentMember = userId
      ? project.members?.find((m) => m.user?.id === userId)
      : undefined;

    return this.toProjectView(
      project,
      project.members?.length ?? 0,
      project.admin?.id ?? null,
      currentMember,
    );
  }

  async updateProject(
    projectId: string,
    body: UpdateProjectDto,
    userId?: string,
  ): Promise<ProjectDto> {
    const project = await this.loadProjectOrFail(projectId);

    if (body.name !== undefined) project.name = body.name;
    if (body.description !== undefined) {
      project.description = body.description;
    }
    if (body.deadline !== undefined) {
      project.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if (body.status !== undefined) project.status = body.status;
    if (body.color !== undefined) project.color = body.color;

    const savedProject = await this.projectRepo.save(project);
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        savedProject.id,
        `updated project settings: ${savedProject.name}`,
        'project',
        savedProject.id,
      );
    }

    const currentMember = userId
      ? (savedProject.members?.find((m) => m.user?.id === userId) ??
        project.members?.find((m) => m.user?.id === userId))
      : undefined;

    return this.toProjectView(
      savedProject,
      savedProject.members?.length ?? project.members?.length ?? 0,
      savedProject.admin?.id ?? project.admin?.id ?? null,
      currentMember,
    );
  }

  async inviteMember(
    projectId: string,
    body: InviteMemberDto,
    actor: ProjectMember,
  ): Promise<{ inviteLink: string }> {
    const project = await this.loadProjectOrFail(projectId);
    const normalizedEmail = body.email.trim().toLowerCase();

    const roleCondition = body.roleId
      ? { id: body.roleId, project: { id: project.id } }
      : { name: 'Viewer', project: { id: project.id } };

    const targetRole = await this.projectRoleRepo.findOne({
      where: roleCondition,
    });
    if (!targetRole) {
      throw new NotFoundException('Selected project role not found');
    }

    const existingMember = await this.projectMemberRepo
      .createQueryBuilder('member')
      .innerJoin('member.project', 'project')
      .innerJoin('member.user', 'user')
      .where('project.id = :projectId', { projectId: project.id })
      .andWhere('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();

    if (existingMember) {
      throw new ConflictException('User is already a project member');
    }

    const existingInvite = await this.inviteRepo.findOne({
      where: {
        project: { id: project.id },
        email: normalizedEmail,
        status: InviteStatus.PENDING,
      },
      relations: { project: true },
    });
    if (existingInvite) {
      throw new ConflictException(
        'A pending invite already exists for this email',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = this.inviteRepo.create({
      project,
      invitedBy: actor.user,
      email: normalizedEmail,
      role: targetRole,
      tokenHash,
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const savedInvite = await this.inviteRepo.save(invite);

    const inviterName = [actor.user?.firstName, actor.user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const frontendUrl = this.configService.get<string>('env.frontendUrl');
    const inviteLink = `${frontendUrl}/project/invitation/${token}`;

    await this.mailService.sendProjectInvite(
      normalizedEmail,
      project.name,
      inviterName || 'A project member',
      inviteLink,
      savedInvite.expiresAt,
    );

    return { inviteLink };
  }

  async getProjectInvites(
    projectId: string,
    page = 1,
    limit = 50,
    status?: InviteStatus,
  ): Promise<{
    invites: Invite[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [invites, total] = await this.inviteRepo.findAndCount({
      where: {
        project: { id: projectId },
        ...(status && { status }),
      },
      relations: { project: true, role: true },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    if (total === 0) {
      const errorMsg = status
        ? `No invites with status '${status}' were found for this project`
        : 'No invites were found for this project';
      throw new NotFoundException(errorMsg);
    }

    return { invites, total, page, limit };
  }

  async getInvite(token: string): Promise<InviteDto> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await this.inviteRepo.findOne({
      where: { tokenHash },
      relations: { project: true, role: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or has been revoked');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `This invitation has already been ${invite.status.toLowerCase()}`,
      );
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invitation link has expired');
    }

    return this.toInviteView(invite);
  }

  async acceptInvite(token: string, userId: string): Promise<ProjectMemberDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await this.inviteRepo.findOne({
      where: { tokenHash },
      relations: { project: { admin: true }, invitedBy: true, role: true },
    });

    if (!invite || invite.status !== InviteStatus.PENDING) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was issued to a different email address',
      );
    }

    const existingMember = await this.projectMemberRepo.findOne({
      where: {
        project: { id: invite.project.id },
        user: { id: user.id },
      },
      relations: { project: true, user: true, role: true },
    });

    if (existingMember) {
      invite.status = InviteStatus.ACCEPTED;
      await this.inviteRepo.save(invite);
      return this.toMemberView(existingMember);
    }

    const member = this.projectMemberRepo.create({
      project: invite.project,
      user,
      role: invite.role,
    });
    const savedMember = await this.projectMemberRepo.save(member);

    invite.status = InviteStatus.ACCEPTED;
    await this.inviteRepo.save(invite);

    const hydratedMember = await this.projectMemberRepo.findOne({
      where: { id: savedMember.id },
      relations: { project: true, user: true, role: true },
    });

    if (!hydratedMember) {
      throw new NotFoundException(
        'Project member not found after invite acceptance',
      );
    }

    await this.activitiesService.logActivity(
      userId,
      invite.project.id,
      `joined project: ${invite.project.name}`,
      'project',
      invite.project.id,
    );

    return this.toMemberView(hydratedMember);
  }

  async declineInvite(token: string, userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await this.inviteRepo.findOne({ where: { tokenHash } });
    if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new NotFoundException('Invite not found');
    }

    invite.status = InviteStatus.REJECTED;
    await this.inviteRepo.save(invite);
  }

  async cancelInvite(projectId: string, inviteId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, project: { id: projectId } },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found for this project');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel an invitation that is already ${invite.status.toLowerCase()}`,
      );
    }

    invite.status = InviteStatus.CANCELLED;
    await this.inviteRepo.save(invite);
  }

  async revokeInvite(projectId: string, inviteId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, project: { id: projectId } },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found for this project');
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Cannot revoke an invitation that is already ${invite.status.toLowerCase()}`,
      );
    }

    invite.status = InviteStatus.REVOKED;
    await this.inviteRepo.save(invite);
  }

  async listMembers(projectId: string): Promise<ProjectMemberDto[]> {
    const members = await this.projectMemberRepo.find({
      where: { project: { id: projectId } },
      relations: { project: true, user: true, role: true },
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => this.toMemberView(member));
  }

  async bulkUpdateMemberRoles(
    projectId: string,
    body: BulkUpdateMemberRolesDto,
    actor: ProjectMember,
  ): Promise<ProjectMemberDto[]> {
    return this.projectRepo.manager.transaction(async (manager) => {
      const assignmentMap = new Map<string, string>();
      for (const assignment of body.assignments) {
        assignmentMap.set(assignment.memberId, assignment.roleId);
      }

      const memberIds = Array.from(assignmentMap.keys());
      const roleIds = Array.from(new Set(assignmentMap.values()));

      const members = await manager.find(ProjectMember, {
        where: { id: In(memberIds), project: { id: projectId } },
        relations: { project: { admin: true }, user: true, role: true },
      });

      const foundMemberIds = new Set(members.map((m) => m.id));
      for (const memberId of memberIds) {
        if (!foundMemberIds.has(memberId)) {
          throw new NotFoundException(
            `Project member with ID ${memberId} not found in this project`,
          );
        }
      }

      const roles = await manager.find(ProjectRoleEntity, {
        where: { id: In(roleIds), project: { id: projectId } },
      });

      const foundRoleIds = new Set(roles.map((r) => r.id));
      for (const roleId of roleIds) {
        if (!foundRoleIds.has(roleId)) {
          throw new NotFoundException(
            `Role with ID ${roleId} not found in this project`,
          );
        }
      }

      const rolesMap = new Map(roles.map((r) => [r.id, r]));

      const currentAdmins = await manager.find(ProjectMember, {
        where: { project: { id: projectId }, role: { level: 100 } },
        relations: { role: true, user: true },
      });
      const currentAdminIds = new Set(currentAdmins.map((m) => m.id));

      let demotions = 0;
      let promotions = 0;

      const updatedMembers: ProjectMember[] = [];

      for (const member of members) {
        const targetRoleId = assignmentMap.get(member.id)!;
        const targetRole = rolesMap.get(targetRoleId)!;

        if (member.role.id === targetRoleId) {
          updatedMembers.push(member);
          continue;
        }

        const isTargetOwner = member.project.admin?.id === member.user?.id;
        if (isTargetOwner && targetRole.level !== 100) {
          throw new BadRequestException(
            'Project owner cannot be downgraded here',
          );
        }

        const actorIsAdmin = actor.role.level === 100;
        const targetIsAdmin = member.role.level === 100;
        const isSelfUpdate = actor.id === member.id;

        if (actorIsAdmin && targetIsAdmin && !isSelfUpdate) {
          throw new ForbiddenException(
            'Admins cannot change the role of another admin',
          );
        }

        const canModify = ProjectAuthEvaluator.canModifyMember(actor, member);
        if (!canModify) {
          throw new ForbiddenException(
            'You cannot modify members with an equal or higher role level hierarchy',
          );
        }

        if (actor.role.level !== 100 && targetRole.level >= actor.role.level) {
          throw new ForbiddenException(
            'You cannot assign a role level equal to or higher than your own',
          );
        }

        const currentlyIsAdmin = currentAdminIds.has(member.id);
        const willBeAdmin = targetRole.level === 100;

        if (currentlyIsAdmin && !willBeAdmin) {
          demotions++;
        } else if (!currentlyIsAdmin && willBeAdmin) {
          promotions++;
        }

        member.role = targetRole;
        updatedMembers.push(member);
      }

      const finalAdminCount = currentAdminIds.size - demotions + promotions;
      if (finalAdminCount < 1) {
        const selfDemotions = members.filter(
          (m) =>
            m.id === actor.id &&
            currentAdminIds.has(m.id) &&
            m.role.level < 100,
        );
        if (selfDemotions.length > 0) {
          throw new BadRequestException(
            'You are the only admin of this project. At least 2 admins must exist before you can change your own role.',
          );
        }
        throw new BadRequestException(
          'Cannot demote the last admin of this project. There must be at least one admin remaining.',
        );
      }

      const savedMembers = await manager.save(ProjectMember, updatedMembers);

      return savedMembers.map((m) => this.toMemberView(m));
    });
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    body: UpdateProjectMemberDto,
  ): Promise<ProjectMemberDto> {
    const member = await this.projectMemberRepo.findOne({
      where: { id: memberId, project: { id: projectId } },
      relations: { project: true, user: true, role: true },
    });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    const targetRole = await this.projectRoleRepo.findOne({
      where: { id: body.roleId, project: { id: projectId } },
    });
    if (!targetRole) {
      throw new NotFoundException('Target role not found in this project');
    }

    if (member.role.level === 100 && targetRole.level < 100) {
      const adminCount = await this.projectMemberRepo
        .createQueryBuilder('pm')
        .innerJoin('pm.role', 'role')
        .where('pm.project_id = :projectId', { projectId })
        .andWhere('role.level = 100')
        .getCount();

      if (adminCount < 2) {
        throw new BadRequestException(
          "Cannot demote the last admin of this project. There must be at least 2 admins before an admin's role can be changed.",
        );
      }
    }

    member.role = targetRole;

    const savedMember = await this.projectMemberRepo.save(member);
    return this.toMemberView(savedMember);
  }

  async removeMember(projectId: string, memberId: string): Promise<void> {
    const member = await this.projectMemberRepo.findOne({
      where: { id: memberId, project: { id: projectId } },
    });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    await this.projectMemberRepo.delete(member.id);
  }

  private async loadProjectOrFail(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: { admin: true, members: { user: true, role: true } },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private toProjectView(
    project: Project,
    memberCount: number,
    adminId: string | null,
    currentMember?: ProjectMember,
  ): ProjectDto {
    if (currentMember) {
      currentMember.project = project;
    }
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      status: project.status,
      adminId,
      memberCount,
      color: project.color,
      currentMember: currentMember
        ? this.toMemberView(currentMember)
        : undefined,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
  }

  private toMemberView(member: ProjectMember): ProjectMemberDto {
    const role = member.role;
    return {
      id: member.id,
      projectId: member.project.id,
      userId: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      title: member.user.title ?? null,
      avatarUrl: member.user.avatarUrl ?? null,
      roleId: role?.id,
      role: role
        ? {
            id: role.id,
            projectId: member.project.id,
            name: role.name,
            description: role.description ?? null,
            level: role.level,
            permissions: role.permissions,
            isSystemRole: role.isSystemRole,
          }
        : (undefined as any),
      roleLabel: (role?.name as ProjectRoleEnum) ?? undefined,
      isAdmin: role?.level === 100,
      joinedAt: member.joinedAt,
    };
  }

  private toInviteView(invite: Invite): InviteDto {
    return {
      id: invite.id,
      projectId: invite.project.id,
      projectName: invite.project.name,
      email: invite.email,
      roleId: invite.role.id,
      roleName: invite.role.name,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    };
  }

  // ─── Project Roles CRUD ────────────────────────────────────────────────

  async listRoles(projectId: string): Promise<ProjectRoleResponseDto[]> {
    const roles = await this.projectRoleRepo.find({
      where: { project: { id: projectId } },
      relations: { project: true },
      order: { level: 'DESC' },
    });
    return roles.map((role) => this.toRoleResponseView(role));
  }

  async createRole(
    projectId: string,
    dto: CreateProjectRoleDto,
    actor: ProjectMember,
  ): Promise<ProjectRoleResponseDto> {
    const project = await this.loadProjectOrFail(projectId);

    if (dto.level < 1 || dto.level > 99) {
      throw new BadRequestException(
        'Custom role level must be between 1 and 99',
      );
    }

    if (actor.role.level !== 100 && dto.level >= actor.role.level) {
      throw new ForbiddenException(
        'You cannot create a role with a level equal to or higher than your own',
      );
    }

    const existingName = await this.projectRoleRepo.findOne({
      where: { project: { id: projectId }, name: dto.name },
    });
    if (existingName) {
      throw new ConflictException(
        'A role with this name already exists in this project',
      );
    }

    const existingLevel = await this.projectRoleRepo.findOne({
      where: { project: { id: projectId }, level: dto.level },
    });
    if (existingLevel) {
      throw new ConflictException(
        'A role with this level already exists in this project',
      );
    }

    const role = this.projectRoleRepo.create({
      ...dto,
      project,
      isSystemRole: false,
    });

    const savedRole = await this.projectRoleRepo.save(role);
    return this.toRoleResponseView(savedRole);
  }

  async updateRole(
    projectId: string,
    roleId: string,
    dto: UpdateProjectRoleDto,
    actor: ProjectMember,
  ): Promise<ProjectRoleResponseDto> {
    const role = await this.projectRoleRepo.findOne({
      where: { id: roleId, project: { id: projectId } },
    });
    if (!role) {
      throw new NotFoundException('Project role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (actor.role.level !== 100 && role.level >= actor.role.level) {
      throw new ForbiddenException(
        'You cannot modify a role with a level equal to or higher than your own',
      );
    }

    if (dto.level !== undefined) {
      if (dto.level < 1 || dto.level > 99) {
        throw new BadRequestException(
          'Custom role level must be between 1 and 99',
        );
      }
      if (actor.role.level !== 100 && dto.level >= actor.role.level) {
        throw new ForbiddenException(
          'You cannot assign a level equal to or higher than your own',
        );
      }

      if (dto.level !== role.level) {
        const existingLevel = await this.projectRoleRepo.findOne({
          where: { project: { id: projectId }, level: dto.level },
        });
        if (existingLevel) {
          throw new ConflictException(
            'A role with this level already exists in this project',
          );
        }
        role.level = dto.level;
      }
    }

    if (dto.name !== undefined && dto.name !== role.name) {
      const existingName = await this.projectRoleRepo.findOne({
        where: { project: { id: projectId }, name: dto.name },
      });
      if (existingName) {
        throw new ConflictException(
          'A role with this name already exists in this project',
        );
      }
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    if (dto.permissions !== undefined) {
      role.permissions = dto.permissions;
    }

    const savedRole = await this.projectRoleRepo.save(role);
    return this.toRoleResponseView(savedRole);
  }

  async deleteRole(
    projectId: string,
    roleId: string,
    actor: ProjectMember,
  ): Promise<void> {
    const role = await this.projectRoleRepo.findOne({
      where: { id: roleId, project: { id: projectId } },
    });
    if (!role) {
      throw new NotFoundException('Project role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    if (actor.role.level !== 100 && role.level >= actor.role.level) {
      throw new ForbiddenException(
        'You cannot delete a role with a level equal to or higher than your own',
      );
    }

    const memberUsingRole = await this.projectMemberRepo.findOne({
      where: { role: { id: roleId }, project: { id: projectId } },
      select: { id: true },
    });
    if (memberUsingRole) {
      throw new ConflictException(
        'Cannot delete a role that is currently assigned to project members',
      );
    }

    const inviteUsingRole = await this.inviteRepo.findOne({
      where: {
        role: { id: roleId },
        project: { id: projectId },
        status: InviteStatus.PENDING,
      },
      select: { id: true },
    });
    if (inviteUsingRole) {
      throw new ConflictException(
        'Cannot delete a role that is currently referenced by pending invites',
      );
    }

    await this.projectRoleRepo.delete(roleId);
  }

  private toRoleResponseView(role: ProjectRoleEntity): ProjectRoleResponseDto {
    return {
      id: role.id,
      projectId: role.project?.id,
      name: role.name,
      description: role.description ?? '',
      level: role.level,
      permissions: role.permissions,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
