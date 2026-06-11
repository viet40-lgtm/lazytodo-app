import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { APP_COLORS } from '../constants';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function recurringLabel(recurring?: Task['recurring']): string | null {
  if (recurring === 'daily') return 'Daily';
  if (recurring === 'weekly') return 'Weekly';
  if (recurring === 'monthly') return 'Monthly';
  return null;
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const swipeRef = useRef<Swipeable>(null);
  const repeat = recurringLabel(task.recurring);

  const renderRightActions = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        swipeRef.current?.close();
        onDelete(task.id);
      }}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </Pressable>
  );

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <View style={[styles.row, task.completed && styles.rowCompleted]}>
        <Pressable
          style={[styles.checkbox, task.completed && styles.checkboxDone]}
          onPress={() => onToggle(task.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
        >
          {task.completed ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>

        <Pressable style={styles.content} onPress={() => onEdit(task)}>
          <Text style={[styles.name, task.completed && styles.nameDone]}>{task.name}</Text>
          {(task.reminder || repeat) && (
            <View style={styles.metaRow}>
              {task.reminder ? <Text style={styles.meta}>⏰ {task.reminder}</Text> : null}
              {repeat ? <Text style={styles.meta}>↻ {repeat}</Text> : null}
            </View>
          )}
        </Pressable>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: 12,
  },
  rowCompleted: {
    opacity: 0.55,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cccccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: APP_COLORS.green,
    borderColor: APP_COLORS.green,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    lineHeight: 28,
    color: APP_COLORS.text,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: APP_COLORS.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  meta: {
    fontSize: 15,
    color: APP_COLORS.textMuted,
  },
  deleteAction: {
    backgroundColor: APP_COLORS.delete,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 12,
    minWidth: 96,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
