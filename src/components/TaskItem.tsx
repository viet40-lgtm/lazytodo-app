import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import {
  APP_COLORS,
  RADIUS,
  SECTION_LABELS,
  SECTION_THEMES,
  SPACING,
  getMoveTargets,
  softShadow,
} from '../constants';
import type { Task, TaskSection } from '../types';
import { formatDuration } from '../utils/time';

interface TaskItemProps {
  task: Task;
  accentColor: string;
  accentSoft: string;
  trackColor: string;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSkip: (id: string) => void;
  onLogTime: (id: string, minutes: number) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

function recurringLabel(recurring?: Task['recurring']): string | null {
  if (recurring === 'daily') return 'D';
  if (recurring === 'weekly') return 'W';
  if (recurring === 'biweekly') return 'B-W';
  if (recurring === 'monthly') return 'M';
  if (recurring === 'yearly') return 'Y';
  return null;
}

function formatReminder(reminder: string): string {
  if (!reminder) return '';
  const parts = reminder.split('T');
  if (parts.length === 2) {
    const dateParts = parts[0].split('-');
    if (dateParts.length === 3) {
      return `${dateParts[1]}-${dateParts[2]} @ ${parts[1]}`;
    }
  }
  return reminder.replace('T', ' @ ');
}

function createdLabel(createdAt: number): string {
  const date = new Date(createdAt);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function TaskRow({
  task,
  accentColor,
  accentSoft,
  trackColor,
  onToggle,
  onEdit,
  onDelete,
  onSkip,
  onLogTime,
  onReorder,
}: TaskItemProps) {
  const repeat = recurringLabel(task.recurring);
  const done = task.completed;
  const hasMeta = Boolean(task.reminder || repeat);

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }, done && styles.cardDone]}>
      <View style={styles.topRow}>
        <Pressable
          style={[
            styles.checkbox,
            { borderColor: APP_COLORS.primary },
            done && { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
          ]}
          onPress={() => onToggle(task.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          hitSlop={8}
        >
          {done ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>

        <Pressable style={styles.titleArea} onPress={() => onEdit(task)}>
          <Text style={[styles.name, done && styles.nameDone]} numberOfLines={3}>
            {task.name}
          </Text>
        </Pressable>

        <View style={styles.corner}>
          <View style={styles.sortArrows}>
            <Pressable hitSlop={8} style={styles.sortArrowBtn} onPress={() => onReorder(task.id, 'up')}>
              <Text style={styles.arrowText}>↑</Text>
            </Pressable>
          </View>
          {Platform.OS === 'web' ? (
            <Pressable
              style={styles.webDelete}
              onPress={() => onDelete(task.id)}
              accessibilityLabel={`Delete ${task.name}`}
              hitSlop={6}
            >
              <Text style={styles.webDeleteText}>X</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {hasMeta || task.recurring ? (
        <View style={styles.metaRow}>
          <Pressable style={styles.metaRowContent} onPress={() => onEdit(task)}>
            {task.reminder ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{formatReminder(task.reminder)}</Text>
              </View>
            ) : null}
            {repeat ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>↻ {repeat}</Text>
              </View>
            ) : null}
          </Pressable>
          {Platform.OS === 'web' && task.recurring ? (
            <Pressable
              style={styles.metaSkipBtn}
              onPress={() => onSkip(task.id)}
              accessibilityLabel={`Skip ${task.name}`}
              hitSlop={6}
            >
              <Text style={styles.metaSkipText}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Pressable
            style={[styles.timeBtn, { backgroundColor: accentSoft }]}
            onPress={() => onLogTime(task.id, 15)}
            hitSlop={4}
          >
            <Text style={[styles.timeBtnText, { color: accentColor }]}>+15m</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={styles.spentChip}>
            <Text style={styles.spentText}>{formatDuration(task.spentMinutes)}</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <View style={styles.spentChip}>
            <Text style={styles.createdText}>{createdLabel(task.createdAt)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function TaskItem(props: TaskItemProps) {
  const swipeRef = useRef<Swipeable>(null);

  if (Platform.OS === 'web') {
    return <TaskRow {...props} />;
  }

  const renderRightActions = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={() => {
        swipeRef.current?.close();
        props.onDelete(props.task.id);
      }}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </Pressable>
  );

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TaskRow {...props} />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...softShadow(0.05, 8, 2),
  },
  cardDone: {
    opacity: 0.55,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: -2,
  },
  sortArrows: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 25,
    fontWeight: '900',
    color: APP_COLORS.delete,
    lineHeight: 25,
    marginTop: -2,
  },
  titleArea: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
  },
  name: {
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: APP_COLORS.textMuted,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metaRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  metaSkipBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: APP_COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: APP_COLORS.primary,
  },
  metaSkipText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  metaChip: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBtn: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  timeBtnText: {
    fontSize: 20,
    fontWeight: '700',
  },
  spentChip: {
    paddingVertical: SPACING.sm,
  },
  spentText: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
  corner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 1,
  },
  createdText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.textSubtle,
  },

  webDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDeleteText: {
    fontSize: 20,
    lineHeight: 25,
    color: APP_COLORS.delete,
    fontWeight: '700',
    marginTop: -2,
  },
  deleteAction: {
    backgroundColor: APP_COLORS.delete,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginLeft: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 96,
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
});
