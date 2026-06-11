export type Recurring = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  name: string;
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
