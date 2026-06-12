export type Recurring = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type TaskSection = 'today' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  name: string;
  section: TaskSection;
  spentMinutes: number;
  completed: boolean;
  completedAt?: number;
  reminder?: string;
  recurring?: Recurring;
  notificationId?: string;
  createdAt: number;
}

export interface AppState {
  tasks: Task[];
  lastCelebrationDate?: string;
  savedAt: number;
}
