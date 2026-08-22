import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { Plan } from '../entities/plan.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { AIFeature } from '../enums/ai-feature.enum';
import { PaymentRequiredException } from '../exceptions/payment-required.exception';
import { Project } from '../../projects/entities/project.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Invite } from '../../projects/entities/invite.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Board } from '../../boards/entities/board.entity';
import { KnowledgeChunk } from '../../ai/entities/knowledge-chunk.entity';
import { ProjectRole } from '../../projects/entities/project-role.entity';
import { InviteStatus } from '@modules/projects/enums/invite-status.enum';

import { DEFAULT_PLANS } from '../constants/default-plans.constant';

interface CachedSubscription {
  subscription: Subscription;
  cachedAt: number;
}

@Injectable()
export class PlanLimitsService {
  private readonly logger = new Logger(PlanLimitsService.name);
  private subscriptionCache = new Map<string, CachedSubscription>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(KnowledgeChunk)
    private readonly knowledgeRepo: Repository<KnowledgeChunk>,
    @InjectRepository(ProjectRole)
    private readonly projectRoleRepo: Repository<ProjectRole>,
  ) {}

  public invalidateCache(userId: string): void {
    this.subscriptionCache.delete(userId);
  }

  /**
   * Helper to ensure the default Free plan is available, self-healing if missing.
   */
  private async ensureFreePlan(): Promise<Plan> {
    let freePlan = await this.planRepo.findOne({
      where: { tier: PlanTier.FREE },
    });

    if (!freePlan) {
      this.logger.warn(
        'Default Free plan not found in database. Auto-seeding default plans...',
      );
      for (const planDef of DEFAULT_PLANS) {
        const existing = await this.planRepo.findOne({
          where: { tier: planDef.tier },
        });
        if (!existing) {
          const created = this.planRepo.create(planDef);
          await this.planRepo.save(created);
        }
      }
      freePlan = await this.planRepo.findOne({
        where: { tier: PlanTier.FREE },
      });
    }

    if (!freePlan) {
      throw new NotFoundException('Default Free plan not found');
    }

    return freePlan;
  }

  /**
   * Retrieves user's active subscription, creating a default FREE subscription if none exists.
   */
  async getUserSubscription(userId: string): Promise<Subscription> {
    const cached = this.subscriptionCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.subscription;
    }

    let sub = await this.subscriptionRepo.findOne({
      where: { userId },
      relations: { plan: true },
    });

    if (!sub) {
      const freePlan = await this.ensureFreePlan();

      sub = this.subscriptionRepo.create({
        userId,
        plan: freePlan,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        aiUsageResetAt: new Date(),
      });
      sub = await this.subscriptionRepo.save(sub);
    }

    // Check if internal monthly quota reset is due
    await this.checkAndResetMonthlyUsage(sub);

    this.subscriptionCache.set(userId, {
      subscription: sub,
      cachedAt: Date.now(),
    });

    return sub;
  }

  /**
   * Checks if monthly AI usage reset is due (>30 days since last reset)
   */
  private async checkAndResetMonthlyUsage(sub: Subscription): Promise<void> {
    const now = new Date();
    const resetDate = new Date(sub.aiUsageResetAt || sub.createdAt);
    const daysSinceReset =
      (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceReset >= 30) {
      sub.aiOnboardingGenerationsUsed = 0;
      sub.aiChatMessagesUsed = 0;
      sub.aiTaskActionsUsed = 0;
      sub.aiTotalRequestsUsed = 0;
      sub.aiUsageResetAt = now;
      await this.subscriptionRepo.save(sub);
    }
  }

  /**
   * Resolves the effective plan for a project based on the project's creator/admin
   */
  async getProjectEffectivePlan(projectId: string): Promise<Plan> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: { admin: true },
    });

    if (!project || !project.admin) {
      const freePlan = await this.ensureFreePlan();
      return freePlan;
    }

    const adminSub = await this.getUserSubscription(project.admin.id);
    return adminSub.plan;
  }

  // ─── Limit Assertions ────────────────────────────────────────────────────────

  /**
   * Asserts user can create a new project based on their personal plan
   */
  async assertCanCreateProject(userId: string): Promise<void> {
    const sub = await this.getUserSubscription(userId);
    const maxProjects = sub.plan.features.maxProjectsOwned;

    if (maxProjects !== null && maxProjects !== undefined) {
      const currentProjects = await this.projectRepo.count({
        where: { admin: { id: userId } },
      });

      if (currentProjects >= maxProjects) {
        throw new PaymentRequiredException({
          code: 'PROJECT_LIMIT_REACHED',
          message: `You have reached the maximum limit of ${maxProjects} projects on the ${sub.plan.name} plan. Upgrade to increase your project limit.`,
          limitType: 'projects',
          limit: maxProjects,
          current: currentProjects,
          requiredPlan:
            sub.plan.tier === PlanTier.FREE ? PlanTier.PRO : PlanTier.BUSINESS,
        });
      }
    }
  }

  /**
   * Asserts a project can invite another member based on the project admin's plan
   */
  async assertCanInviteMember(projectId: string): Promise<void> {
    const effectivePlan = await this.getProjectEffectivePlan(projectId);
    const maxMembers = effectivePlan.features.maxMembersPerProject;

    if (maxMembers !== null && maxMembers !== undefined) {
      const currentMembers = await this.memberRepo.count({
        where: { project: { id: projectId } },
      });

      const pendingInvites = await this.inviteRepo.count({
        where: {
          project: { id: projectId },
          status: InviteStatus.PENDING,
        },
      });

      const totalOccupied = currentMembers + pendingInvites;

      if (totalOccupied >= maxMembers) {
        throw new PaymentRequiredException({
          code: 'MEMBER_LIMIT_REACHED',
          message: `This project has reached the maximum limit of ${maxMembers} members allowed on the ${effectivePlan.name} plan. The project owner needs to upgrade.`,
          limitType: 'members',
          limit: maxMembers,
          current: totalOccupied,
          requiredPlan:
            effectivePlan.tier === PlanTier.FREE
              ? PlanTier.PRO
              : PlanTier.BUSINESS,
        });
      }
    }
  }

  /**
   * Asserts a project can add another task based on the project admin's plan
   */
  async assertCanCreateTask(projectId: string): Promise<void> {
    const effectivePlan = await this.getProjectEffectivePlan(projectId);
    const maxTasks = effectivePlan.features.maxTasksPerProject;

    if (maxTasks !== null && maxTasks !== undefined) {
      const currentTasks = await this.taskRepo.count({
        where: { project: { id: projectId } },
      });

      if (currentTasks >= maxTasks) {
        throw new PaymentRequiredException({
          code: 'TASK_LIMIT_REACHED',
          message: `This project has reached the maximum limit of ${maxTasks} tasks allowed on the ${effectivePlan.name} plan. The project owner needs to upgrade.`,
          limitType: 'tasks',
          limit: maxTasks,
          current: currentTasks,
          requiredPlan:
            effectivePlan.tier === PlanTier.FREE
              ? PlanTier.PRO
              : PlanTier.BUSINESS,
        });
      }
    }
  }

  /**
   * Asserts a project can add another board column based on the project admin's plan
   */
  async assertCanCreateBoardColumn(projectId: string): Promise<void> {
    const effectivePlan = await this.getProjectEffectivePlan(projectId);
    const maxColumns = effectivePlan.features.maxBoardColumns;

    if (maxColumns !== null && maxColumns !== undefined) {
      const currentColumns = await this.boardRepo.count({
        where: { project: { id: projectId } },
      });

      if (currentColumns >= maxColumns) {
        throw new PaymentRequiredException({
          code: 'COLUMN_LIMIT_REACHED',
          message: `This project has reached the maximum limit of ${maxColumns} board columns allowed on the ${effectivePlan.name} plan. The project owner needs to upgrade.`,
          limitType: 'board_columns',
          limit: maxColumns,
          current: currentColumns,
          requiredPlan: PlanTier.PRO,
        });
      }
    }
  }

  /**
   * Asserts custom roles can be created in a project based on the project admin's plan
   */
  async assertCanCreateCustomRole(projectId: string): Promise<void> {
    const effectivePlan = await this.getProjectEffectivePlan(projectId);
    const maxCustomRoles = effectivePlan.features.maxCustomRoles;

    // Unlimited for Pro and Business plans
    if (maxCustomRoles === null) {
      return;
    }

    // Count existing custom roles (non-system roles) in the project
    const currentCustomRoles = await this.projectRoleRepo.count({
      where: { project: { id: projectId }, isSystemRole: false },
    });

    if (currentCustomRoles >= maxCustomRoles) {
      throw new PaymentRequiredException({
        code: 'CUSTOM_ROLES_LIMIT_REACHED',
        message: `You have reached the maximum limit of ${maxCustomRoles} custom roles allowed on the ${effectivePlan.name} plan.`,
        limitType: 'custom_roles',
        limit: maxCustomRoles,
        current: currentCustomRoles,
        requiredPlan:
          effectivePlan.tier === PlanTier.FREE ? PlanTier.PRO : PlanTier.BUSINESS,
      });
    }
  }

  /**
   * Asserts knowledge base documents can be created/searched in a project
   */
  async assertCanUseKnowledge(projectId: string): Promise<void> {
    const effectivePlan = await this.getProjectEffectivePlan(projectId);

    if (!effectivePlan.features.knowledgeBaseEnabled) {
      throw new PaymentRequiredException({
        code: 'KNOWLEDGE_BASE_NOT_ALLOWED',
        message: `Knowledge Base is only available on Pro and Business plans. The project owner needs to upgrade.`,
        limitType: 'knowledge_base',
        requiredPlan: PlanTier.PRO,
      });
    }

    const maxChunks = effectivePlan.features.maxKnowledgeChunks;
    if (maxChunks !== null && maxChunks !== undefined) {
      const currentChunks = await this.knowledgeRepo.count({
        where: { project: { id: projectId } },
      });

      if (currentChunks >= maxChunks) {
        throw new PaymentRequiredException({
          code: 'KNOWLEDGE_CHUNK_LIMIT_REACHED',
          message: `This project has reached the maximum limit of ${maxChunks} knowledge documents allowed on the ${effectivePlan.name} plan.`,
          limitType: 'knowledge_chunks',
          limit: maxChunks,
          current: currentChunks,
          requiredPlan: PlanTier.BUSINESS,
        });
      }
    }
  }

  // ─── AI Quota Assertion & Tracking ──────────────────────────────────────────

  /**
   * Two-factor AI privilege assertion:
   * 1. If project admin is Business -> UNLIMITED access for any member!
   * 2. If user is Business -> UNLIMITED access.
   * 3. If user is Pro -> Uses personal Pro quota for the specific feature.
   * 4. If user is Free -> Limited to 3 total AI requests per month across all projects.
   */
  async assertCanUseAI(
    userId: string,
    projectId?: string,
    feature?: AIFeature,
  ): Promise<void> {
    // 1. If inside a project, check if project admin is Business
    if (projectId) {
      const projectPlan = await this.getProjectEffectivePlan(projectId);
      if (projectPlan.tier === PlanTier.BUSINESS) {
        return; // Unlimited AI for any member in a Business project!
      }
    }

    // 2. Check user's own subscription
    const sub = await this.getUserSubscription(userId);

    // Business users have unlimited AI
    if (sub.plan.tier === PlanTier.BUSINESS) {
      return;
    }

    // Pro users have dedicated monthly quotas per feature
    if (sub.plan.tier === PlanTier.PRO) {
      if (feature === AIFeature.ONBOARDING) {
        const max = sub.plan.features.aiOnboardingGenerations ?? 6;
        if (sub.aiOnboardingGenerationsUsed >= max) {
          throw new PaymentRequiredException({
            code: 'AI_ONBOARDING_QUOTA_EXCEEDED',
            message: `You have reached your monthly quota of ${max} AI Onboarding plans on the Pro plan.`,
            limitType: 'ai_onboarding',
            limit: max,
            current: sub.aiOnboardingGenerationsUsed,
            requiredPlan: PlanTier.BUSINESS,
          });
        }
      } else if (feature === AIFeature.CHAT) {
        const max = sub.plan.features.aiChatMessages ?? 40;
        if (sub.aiChatMessagesUsed >= max) {
          throw new PaymentRequiredException({
            code: 'AI_CHAT_QUOTA_EXCEEDED',
            message: `You have reached your monthly quota of ${max} AI Chat messages on the Pro plan.`,
            limitType: 'ai_chat',
            limit: max,
            current: sub.aiChatMessagesUsed,
            requiredPlan: PlanTier.BUSINESS,
          });
        }
      } else if (feature === AIFeature.TASK) {
        const max = sub.plan.features.aiTaskActions ?? 20;
        if (sub.aiTaskActionsUsed >= max) {
          throw new PaymentRequiredException({
            code: 'AI_TASK_QUOTA_EXCEEDED',
            message: `You have reached your monthly quota of ${max} AI Task actions on the Pro plan.`,
            limitType: 'ai_task',
            limit: max,
            current: sub.aiTaskActionsUsed,
            requiredPlan: PlanTier.BUSINESS,
          });
        }
      }
      return;
    }

    // Free users: capped at 3 total AI requests per month
    const maxFree = sub.plan.features.freeTierAiRequestsPerMonth ?? 3;
    if (sub.aiTotalRequestsUsed >= maxFree) {
      throw new PaymentRequiredException({
        code: 'AI_FREE_QUOTA_EXCEEDED',
        message: `You have used your ${maxFree} free monthly AI requests. Upgrade to Pro for dedicated monthly AI quotas or join a Business project for unlimited access.`,
        limitType: 'ai_total',
        limit: maxFree,
        current: sub.aiTotalRequestsUsed,
        requiredPlan: PlanTier.PRO,
      });
    }
  }

  /**
   * Increments internal AI usage counters after successful AI execution
   */
  async incrementAIUsage(
    userId: string,
    projectId?: string,
    feature?: AIFeature,
  ): Promise<void> {
    // If inside a project whose admin is Business, do not increment personal quota
    if (projectId) {
      const projectPlan = await this.getProjectEffectivePlan(projectId);
      if (projectPlan.tier === PlanTier.BUSINESS) {
        return;
      }
    }

    const sub = await this.getUserSubscription(userId);

    if (sub.plan.tier === PlanTier.BUSINESS) {
      return;
    }

    sub.aiTotalRequestsUsed += 1;

    if (feature === AIFeature.ONBOARDING) {
      sub.aiOnboardingGenerationsUsed += 1;
    } else if (feature === AIFeature.CHAT) {
      sub.aiChatMessagesUsed += 1;
    } else if (feature === AIFeature.TASK) {
      sub.aiTaskActionsUsed += 1;
    }

    await this.subscriptionRepo.save(sub);
    this.invalidateCache(userId);
  }
}
