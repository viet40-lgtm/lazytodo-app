import type { Task } from '../types';

export function isGoalComplete(task: Task): boolean {
  return task.completed;
}
