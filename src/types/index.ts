export type Recurring = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type TaskSection = 'today' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  name: string;
  section: TaskSection;
  spentMinutes: number;
  completed: boolean;
  completedAt?: number;
  showAfter?: number;
  reminder?: string;
  recurring?: Recurring;
  notificationId?: string;
  createdAt: number;
  updatedAt?: number;
  order?: number;
  deleted?: boolean;
}

export interface AppState {
  tasks: Task[];
  lastCelebrationDate?: string;
  savedAt: number;
}
