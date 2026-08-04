export interface AssigneeRecommendationResponse {
  recommendedUserId: string;
  recommendedUserName: string;
  confidenceScore: number;
  explanation: string;
}

export interface TaskBreakdownResponse {
  subtasks: {
    title: string;
    sortOrder: number;
  }[];
}

export interface GeneratedDescriptionResponse {
  description: string;
  acceptanceCriteria: string[];
}

export interface ProjectOverviewSummaryResponse {
  statusSummary: string;
  bottlenecks: string[];
  workloadWarnings: string[];
}

export interface DashboardSummaryResponse {
  headline: string;
  quickInsight: string;
  focusRecommendation: string;
}
