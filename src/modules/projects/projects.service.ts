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
import { Repository } from 'typeorm';
import { CreateProjectDto } from './dtos/create-project.dto';
import { User } from '../users/entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Invite } from './entities/invite.entity';
import crypto from 'crypto';
import { ProjectStatus } from './enums/project-status.enum';
import { ProjectRole } from './enums/project-role.enum';
import { InviteStatus } from './enums/invite-status.enum';
import { UpdateProjectDto } from './dtos/update-project.dto';
import { InviteMemberDto } from './dtos/invite-member.dto';
import { UpdateProjectMemberDto } from './dtos/update-project-member.dto';
import { ProjectDto } from './dtos/project.dto';
import { InviteCreatedDto } from './dtos/invite-created.dto';
import { InviteDto } from './dtos/invite.dto';
import { ProjectMemberDto } from './dtos/project-member.dto';
import { MailService } from '../../shared/providers/mail/mail.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(Invite) private inviteRepo: Repository<Invite>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private mailService: MailService,
  ) {}

  async create(body: CreateProjectDto, userId: string): Promise<ProjectDto> {
    const owner = await this.userRepo.findOne({ where: { id: userId } });
    if (!owner) {
      throw new UnauthorizedException('User not found');
    }

    const project = this.projectRepo.create({
      name: body.name,
      description: body.description ?? null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      status: body.status ?? ProjectStatus.ACTIVE,
      admin: owner,
    });

    const savedProject = await this.projectRepo.save(project);

    await this.projectMemberRepo.save(
      this.projectMemberRepo.create({
        project: savedProject,
        user: owner,
        roleLabel: ProjectRole.OWNER,
        isAdmin: true,
      }),
    );

    return this.toProjectView(savedProject, 1, owner.id);
  }

  async getMyProjects(userId: string): Promise<ProjectDto[]> {
    const projects = await this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.admin', 'admin')
      .leftJoinAndSelect('project.members', 'member')
      .leftJoinAndSelect('member.user', 'memberUser')
      .where('project.admin_id = :userId', { userId })
      .orWhere(
        'project.id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = :userId)',
        { userId },
      )
      .orderBy('project.created_at', 'DESC')
      .getMany();

    return projects.map((project) =>
      this.toProjectView(
        project,
        project.members?.length ?? 0,
        project.admin?.id ?? null,
      ),
    );
  }

  async getProject(projectId: string, userId: string): Promise<ProjectDto> {
    const project = await this.loadProjectOrFail(projectId);
    this.assertProjectAccess(project, userId);

    return this.toProjectView(
      project,
      project.members?.length ?? 0,
      project.admin?.id ?? null,
    );
  }

  async updateProject(
    projectId: string,
    body: UpdateProjectDto,
    userId: string,
  ): Promise<ProjectDto> {
    const project = await this.loadProjectOrFail(projectId);
    this.assertProjectAdmin(project, userId);

    if (body.name !== undefined) project.name = body.name;
    if (body.description !== undefined) {
      project.description = body.description;
    }
    if (body.deadline !== undefined) {
      project.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    if (body.status !== undefined) project.status = body.status;

    const savedProject = await this.projectRepo.save(project);

    return this.toProjectView(
      savedProject,
      savedProject.members?.length ?? project.members?.length ?? 0,
      savedProject.admin?.id ?? project.admin?.id ?? null,
    );
  }

  async inviteMember(
    projectId: string,
    body: InviteMemberDto,
    userId: string,
  ): Promise<InviteCreatedDto> {
    const project = await this.loadProjectOrFail(projectId);
    this.assertProjectAdmin(project, userId);

    const normalizedEmail = body.email.trim().toLowerCase();
    const roleLabel = body.roleLabel ?? ProjectRole.VIEWER;

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
      invitedBy: project.admin!,
      email: normalizedEmail,
      roleLabel,
      tokenHash,
      status: InviteStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const savedInvite = await this.inviteRepo.save(invite);

    const inviterName = [project.admin?.firstName, project.admin?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    await this.mailService.sendProjectInvite(
      normalizedEmail,
      project.name,
      inviterName || 'A project admin',
      token,
      savedInvite.expiresAt,
    );

    return this.toCreatedInviteView(savedInvite, token);
  }

  async acceptInvite(token: string, userId: string): Promise<ProjectMemberDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await this.inviteRepo.findOne({
      where: { tokenHash },
      relations: { project: { admin: true }, invitedBy: true },
    });

    if (!invite || invite.status !== InviteStatus.PENDING) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('Invite does not belong to this user');
    }

    const existingMember = await this.projectMemberRepo.findOne({
      where: {
        project: { id: invite.project.id },
        user: { id: user.id },
      },
      relations: { project: true, user: true },
    });

    if (existingMember) {
      invite.status = InviteStatus.ACCEPTED;
      await this.inviteRepo.save(invite);
      return this.toMemberView(existingMember);
    }

    const member = this.projectMemberRepo.create({
      project: invite.project,
      user,
      roleLabel: invite.roleLabel,
      isAdmin: invite.roleLabel === ProjectRole.OWNER,
    });
    const savedMember = await this.projectMemberRepo.save(member);

    invite.status = InviteStatus.ACCEPTED;
    await this.inviteRepo.save(invite);

    return this.toMemberView(savedMember);
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

  async listMembers(
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberDto[]> {
    const project = await this.loadProjectOrFail(projectId);
    this.assertProjectAccess(project, userId);

    const members = await this.projectMemberRepo.find({
      where: { project: { id: project.id } },
      relations: { project: true, user: true },
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => this.toMemberView(member));
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    body: UpdateProjectMemberDto,
    userId: string,
  ): Promise<ProjectMemberDto> {
    const project = await this.loadProjectOrFail(projectId);
    this.assertProjectAdmin(project, userId);

    const member = await this.projectMemberRepo.findOne({
      where: { id: memberId, project: { id: project.id } },
      relations: { project: true, user: true },
    });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    if (
      this.isProjectOwnerMember(member) &&
      body.roleLabel !== ProjectRole.OWNER
    ) {
      throw new BadRequestException(
        'Project owner role cannot be downgraded here',
      );
    }

    member.roleLabel = body.roleLabel;
    member.isAdmin = body.roleLabel === ProjectRole.OWNER;

    const savedMember = await this.projectMemberRepo.save(member);
    return this.toMemberView(savedMember);
  }

  async removeMember(
    projectId: string,
    memberId: string,
    userId: string,
  ): Promise<void> {
    const project = await this.loadProjectOrFail(projectId);
    this.assertProjectAdmin(project, userId);

    const member = await this.projectMemberRepo.findOne({
      where: { id: memberId, project: { id: project.id } },
      relations: { project: true, user: true },
    });
    if (!member) {
      throw new NotFoundException('Project member not found');
    }
    if (this.isProjectOwnerMember(member)) {
      throw new BadRequestException('Project owner cannot be removed');
    }

    await this.projectMemberRepo.delete(member.id);
  }

  private async loadProjectOrFail(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: { admin: true, members: { user: true } },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private assertProjectAccess(project: Project, userId: string): void {
    if (project.admin?.id === userId) return;

    const isMember = project.members?.some(
      (member) => member.user.id === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private assertProjectAdmin(project: Project, userId: string): void {
    if (project.admin?.id === userId) return;

    const isAdminMember = project.members?.some(
      (member) =>
        member.user.id === userId && this.isProjectOwnerMember(member),
    );
    if (!isAdminMember) {
      throw new ForbiddenException(
        'Only project admins can perform this action',
      );
    }
  }

  private toProjectView(
    project: Project,
    memberCount: number,
    adminId: string | null,
  ): ProjectDto {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      status: project.status,
      adminId,
      memberCount,
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
  }

  private toMemberView(member: ProjectMember): ProjectMemberDto {
    return {
      id: member.id,
      projectId: member.project.id,
      userId: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      title: member.user.title ?? null,
      avatarUrl: member.user.avatarUrl ?? null,
      roleLabel: member.roleLabel,
      isAdmin: member.isAdmin,
      joinedAt: member.joinedAt,
    };
  }

  private toInviteView(invite: Invite): InviteDto {
    return {
      id: invite.id,
      projectId: invite.project.id,
      email: invite.email,
      roleLabel: invite.roleLabel,
      status: invite.status,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    };
  }

  private toCreatedInviteView(invite: Invite, token: string): InviteCreatedDto {
    return {
      ...this.toInviteView(invite),
      token,
    };
  }

  private isProjectOwnerMember(member: ProjectMember): boolean {
    return member.isAdmin || member.roleLabel === ProjectRole.OWNER;
  }
}
