export interface ProjectAnalyticsResponse {
  project_id: string;
  title: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  status: string;
  health: string;
  inprogress_tasks: number;
}
