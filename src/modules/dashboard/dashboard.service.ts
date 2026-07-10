import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, MoreThan, LessThanOrEqual } from 'typeorm';
import { Task } from '@modules/tasks/entities/task.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { ActivityLog } from '@modules/activities/entities/activity-log.entity';
import { User } from '@modules/users/entities/user.entity';
import { TaskStatus } from '@modules/tasks/enums/task-status.enum';
import { ActivitiesService } from '@modules/activities/activities.service';
import { ProjectAuthEvaluator } from '@modules/projects/utils/project-auth.evaluator';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async getDashboardSummary(userId: string) {
    // 1. Get user projects
    const members = await this.projectMemberRepo.find({
      where: { user: { id: userId } },
      relations: { project: true, role: true },
      order: { project: { updated_at: 'DESC' } },
    });

    const projectIds = members.map((m) => m.project.id);

    // Stats calculations
    let totalProjects = members.length;
    let myTasksCount = 0;
    let completedCount = 0;
    let dueTodayCount = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (projectIds.length > 0) {
      // My Tasks (Assigned to user, non-DONE)
      myTasksCount = await this.taskRepo.count({
        where: {
          assignee: { id: userId },
          status: TaskStatus.TODO || TaskStatus.IN_PROGRESS || TaskStatus.IN_REVIEW || TaskStatus.BACKLOG,
        },
      });

      // Completed Tasks (Assigned to user, status DONE)
      completedCount = await this.taskRepo.count({
        where: {
          assignee: { id: userId },
          status: TaskStatus.DONE,
        },
      });

      // Due Today Tasks (Assigned to user, status != DONE, deadline is today)
      dueTodayCount = await this.taskRepo.createQueryBuilder('task')
        .where('task.assignee_id = :userId', { userId })
        .andWhere('task.status != :done', { done: TaskStatus.DONE })
        .andWhere('task.deadline >= :todayStart', { todayStart })
        .andWhere('task.deadline <= :todayEnd', { todayEnd })
        .getCount();
    }

    // Dynamic Trend calculations
    // Projects trend: count joined this month (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const projectsJoinedThisMonth = members.filter((m) => m.joinedAt >= thirtyDaysAgo).length;

    // Tasks trend: tasks completed in last 7 days vs previous 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const completedLastWeek = await this.taskRepo.count({
      where: {
        assignee: { id: userId },
        status: TaskStatus.DONE,
        updatedAt: MoreThan(sevenDaysAgo),
      },
    });
    const completedPrevWeek = await this.taskRepo.count({
      where: {
        assignee: { id: userId },
        status: TaskStatus.DONE,
        updatedAt: MoreThan(fourteenDaysAgo) && LessThanOrEqual(sevenDaysAgo), // Note logic handling
      },
    });

    let completedTrendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    let completedTrendLabel = '0% from last week';
    if (completedPrevWeek > 0) {
      const pct = Math.round(((completedLastWeek - completedPrevWeek) / completedPrevWeek) * 100);
      if (pct > 0) {
        completedTrendDirection = 'up';
        completedTrendLabel = `${pct}% from last week`;
      } else if (pct < 0) {
        completedTrendDirection = 'down';
        completedTrendLabel = `${Math.abs(pct)}% from last week`;
      }
    } else if (completedLastWeek > 0) {
      completedTrendDirection = 'up';
      completedTrendLabel = `+${completedLastWeek} from last week`;
    }

    // Due today trend: count due today vs due yesterday
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
    const dueYesterdayCount = await this.taskRepo.createQueryBuilder('task')
      .where('task.assignee_id = :userId', { userId })
      .andWhere('task.status != :done', { done: TaskStatus.DONE })
      .andWhere('task.deadline >= :yesterdayStart', { yesterdayStart })
      .andWhere('task.deadline <= :yesterdayEnd', { yesterdayEnd })
      .getCount();

    let dueTodayTrendDirection: 'up' | 'down' | 'neutral' = 'neutral';
    let dueTodayTrendLabel = 'same as yesterday';
    const dueDiff = dueTodayCount - dueYesterdayCount;
    if (dueDiff > 0) {
      dueTodayTrendDirection = 'up';
      dueTodayTrendLabel = `${dueDiff} from yesterday`;
    } else if (dueDiff < 0) {
      dueTodayTrendDirection = 'down';
      dueTodayTrendLabel = `${Math.abs(dueDiff)} from yesterday`;
    }

    const stats = [
      {
        id: 'stat-total-projects',
        label: 'Total Projects',
        value: totalProjects,
        icon: 'folder' as const,
        trend: {
          direction: projectsJoinedThisMonth > 0 ? ('up' as const) : ('neutral' as const),
          label: `${projectsJoinedThisMonth} this month`,
        },
      },
      {
        id: 'stat-my-tasks',
        label: 'My Tasks',
        value: myTasksCount,
        icon: 'list-checks' as const,
        trend: {
          direction: 'neutral' as const,
          label: 'Active tasks',
        },
      },
      {
        id: 'stat-completed',
        label: 'Completed',
        value: completedCount,
        icon: 'check-circle' as const,
        trend: {
          direction: completedTrendDirection,
          label: completedTrendLabel,
        },
      },
      {
        id: 'stat-due-today',
        label: 'Due Today',
        value: dueTodayCount,
        icon: 'clock' as const,
        trend: {
          direction: dueTodayTrendDirection,
          label: dueTodayTrendLabel,
        },
      },
    ];

    // Upcoming Deadlines (assigned, non-done, future deadlines)
    let upcomingDeadlines: any[] = [];
    if (projectIds.length > 0) {
      const tasks = await this.taskRepo.createQueryBuilder('task')
        .leftJoinAndSelect('task.project', 'project')
        .where('task.assignee_id = :userId', { userId })
        .andWhere('task.status != :done', { done: TaskStatus.DONE })
        .andWhere('task.deadline > :now', { now: new Date() })
        .orderBy('task.deadline', 'ASC')
        .take(5)
        .getMany();

      upcomingDeadlines = tasks.map((t) => ({
        id: `deadline-${t.id}`,
        taskId: t.id,
        title: t.title,
        projectId: t.project.id,
        projectName: t.project.name,
        dueDate: t.deadline ? new Date(t.deadline).toISOString() : '',
        priority: t.priority,
      }));
    }

    // Recent Activity (logs from user's projects)
    let recentActivity: any[] = [];
    if (projectIds.length > 0) {
      const logs = await this.activityLogRepo.createQueryBuilder('log')
        .leftJoinAndSelect('log.actor', 'actor')
        .leftJoin('log.project', 'project')
        .where('project.id IN (:...projectIds)', { projectIds })
        .orderBy('log.created_at', 'DESC')
        .take(10)
        .getMany();

      recentActivity = logs.map((l) => ({
        id: l.id,
        actor: {
          id: l.actor.id,
          name: `${l.actor.firstName} ${l.actor.lastName}`.trim(),
          avatar: l.actor.avatarUrl || '',
        },
        message: l.message,
        projectName: l.projectName || 'General',
        createdAt: l.createdAt.toISOString(),
      }));
    }

    // Recent Projects (up to 4 projects sorted by updated_at DESC)
    const recentProjects: any[] = [];
    const topMembers = members.slice(0, 4);

    for (const m of topMembers) {
      const totalProjTasks = await this.taskRepo.count({
        where: { project: { id: m.project.id } },
      });
      const completedProjTasks = await this.taskRepo.count({
        where: { project: { id: m.project.id }, status: TaskStatus.DONE },
      });
      const progress = totalProjTasks > 0 ? Math.round((completedProjTasks / totalProjTasks) * 100) : 0;

      recentProjects.push({
        id: m.project.id,
        name: m.project.name,
        role: m.role.level >= 80 ? ('ADMIN' as const) : ('MEMBER' as const),
        progress,
        color: m.project.color || '#d97706',
      });
    }

    return {
      stats,
      upcomingDeadlines,
      recentActivity,
      recentProjects,
    };
  }

  async getTaskProgress(userId: string, range: 'last_7_days' | 'last_30_days' | 'this_month') {
    // We only aggregate completed tasks assigned to the user
    // First, verify range is valid (guarded by DTO but double check)
    const now = new Date();

    if (range === 'last_7_days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const tasks = await this.taskRepo.createQueryBuilder('task')
        .where('task.assignee_id = :userId', { userId })
        .andWhere('task.status = :status', { status: TaskStatus.DONE })
        .andWhere('task.updated_at >= :since', { since: sevenDaysAgo })
        .getMany();

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const pointsMap = new Map<string, number>();

      // Generate the last 7 days including today
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        const dayName = daysOfWeek[d.getDay()];
        pointsMap.set(dayName, 0);
      }

      for (const t of tasks) {
        const dayName = daysOfWeek[t.updatedAt.getDay()];
        if (pointsMap.has(dayName)) {
          pointsMap.set(dayName, pointsMap.get(dayName)! + 1);
        }
      }

      const points = Array.from(pointsMap.entries()).map(([day, completed]) => ({
        day,
        completed,
      }));

      return { range, points };
    }

    if (range === 'last_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const tasks = await this.taskRepo.createQueryBuilder('task')
        .where('task.assignee_id = :userId', { userId })
        .andWhere('task.status = :status', { status: TaskStatus.DONE })
        .andWhere('task.updated_at >= :since', { since: thirtyDaysAgo })
        .getMany();

      const points = [
        { day: 'Week 1', completed: 0 },
        { day: 'Week 2', completed: 0 },
        { day: 'Week 3', completed: 0 },
        { day: 'Week 4', completed: 0 },
      ];

      for (const t of tasks) {
        const diffMs = now.getTime() - t.updatedAt.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < 7) {
          points[3].completed++; // Current week
        } else if (diffDays >= 7 && diffDays < 14) {
          points[2].completed++;
        } else if (diffDays >= 14 && diffDays < 21) {
          points[1].completed++;
        } else if (diffDays >= 21 && diffDays < 30) {
          points[0].completed++;
        }
      }

      return { range, points };
    }

    if (range === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const tasks = await this.taskRepo.createQueryBuilder('task')
        .where('task.assignee_id = :userId', { userId })
        .andWhere('task.status = :status', { status: TaskStatus.DONE })
        .andWhere('task.updated_at >= :since', { since: startOfMonth })
        .getMany();

      const points = [
        { day: 'Week 1', completed: 0 },
        { day: 'Week 2', completed: 0 },
        { day: 'Week 3', completed: 0 },
        { day: 'Week 4', completed: 0 },
      ];

      for (const t of tasks) {
        const date = t.updatedAt.getDate();
        if (date >= 1 && date <= 7) {
          points[0].completed++;
        } else if (date >= 8 && date <= 14) {
          points[1].completed++;
        } else if (date >= 15 && date <= 21) {
          points[2].completed++;
        } else if (date >= 22) {
          points[3].completed++;
        }
      }

      return { range, points };
    }

    return { range, points: [] };
  }

  async getTodaysFocus(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasks = await this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.assignee_id = :userId', { userId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('task.status != :doneStatus AND task.deadline <= :todayEnd', {
            doneStatus: TaskStatus.DONE,
            todayEnd,
          })
          .orWhere('task.status = :doneStatus AND task.updated_at >= :todayStart', {
            doneStatus: TaskStatus.DONE,
            todayStart,
          });
        })
      )
      .orderBy('task.deadline', 'ASC')
      .addOrderBy('task.updated_at', 'DESC')
      .getMany();

    return tasks.map((t) => {
      let timeStr = 'Anytime';
      if (t.deadline) {
        timeStr = new Date(t.deadline).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return {
        id: `focus-${t.id}`,
        taskId: t.id,
        title: t.title,
        projectName: t.project?.name || 'General',
        time: timeStr,
        completed: t.status === TaskStatus.DONE,
      };
    });
  }

  async toggleFocusItem(userId: string, taskId: string, completed: boolean) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true, assignee: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Security check: must be a member of the project
    const member = await this.projectMemberRepo.findOne({
      where: { project: { id: task.project.id }, user: { id: userId } },
      relations: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Permission check: must be the assignee or have update permission
    const isAssignee = task.assignee?.id === userId;
    const hasUpdatePerm = ProjectAuthEvaluator.hasPermission(member, 'tasks', 'update');

    if (!isAssignee && !hasUpdatePerm) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    // Toggle status
    const oldStatus = task.status;
    task.status = completed ? TaskStatus.DONE : TaskStatus.IN_PROGRESS;
    await this.taskRepo.save(task);

    // Log the activity
    const action = completed ? 'completed' : 'reopened';
    await this.activitiesService.logActivity(
      userId,
      task.project.id,
      `${action} task: ${task.title}`,
      'task',
      task.id,
    );

    let timeStr = 'Anytime';
    if (task.deadline) {
      timeStr = new Date(task.deadline).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    return {
      id: `focus-${task.id}`,
      taskId: task.id,
      title: task.title,
      projectName: task.project.name,
      time: timeStr,
      completed,
    };
  }
}
