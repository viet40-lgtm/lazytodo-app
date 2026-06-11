import { StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../constants';
import type { Task } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, onToggle, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No tasks yet. Tap + when you&apos;re ready.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <View style={styles.list}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  list: {
    gap: 8,
  },
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 18,
    lineHeight: 26,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
  },
});
