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
  onLogTime: (id: string, minutes: number) => void;
  onMoveSection: (id: string, section: TaskSection) => void;
}

function recurringLabel(recurring?: Task['recurring']): string | null {
  if (recurring === 'daily') return 'Daily';
  if (recurring === 'weekly') return 'Week';
  if (recurring === 'monthly') return 'Month';
  if (recurring === 'yearly') return 'Year';
  return null;
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
  onLogTime,
  onMoveSection,
}: TaskItemProps) {
  const repeat = recurringLabel(task.recurring);
  const done = task.completed;
  const moveTargets = getMoveTargets(task.section);
  const hasMeta = Boolean(task.reminder || repeat);

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }, done && styles.cardDone]}>
      <View style={styles.topRow}>
        <Pressable
          style={[
            styles.checkbox,
            { borderColor: trackColor },
            done && { backgroundColor: accentColor, borderColor: accentColor },
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
          {hasMeta ? (
            <View style={styles.metaRow}>
              {task.reminder ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>⏰ {task.reminder}</Text>
                </View>
              ) : null}
              {repeat ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>↻ {repeat}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>

        <View style={styles.corner}>
          <Text style={styles.createdText}>{createdLabel(task.createdAt)}</Text>
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

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.timeBtn, { backgroundColor: accentSoft }]}
          onPress={() => onLogTime(task.id, 15)}
          hitSlop={4}
        >
          <Text style={[styles.timeBtnText, { color: accentColor }]}>+15m</Text>
        </Pressable>
        <View style={styles.spentChip}>
          <Text style={styles.spentText}>🕒 {formatDuration(task.spentMinutes)}</Text>
        </View>
        <Text style={styles.moveLabel}>Move:</Text>
        <View style={styles.moveGroup}>
          {moveTargets.map((target) => {
            const targetTheme = SECTION_THEMES[target];
            return (
              <Pressable
                key={target}
                style={styles.moveBtn}
                onPress={() => onMoveSection(task.id, target)}
                hitSlop={4}
                accessibilityLabel={`Move to ${SECTION_LABELS[target]}`}
              >
                <Text style={[styles.moveText, { color: targetTheme.accent }]} numberOfLines={1}>
                  {targetTheme.icon}
                </Text>
              </Pressable>
            );
          })}
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
    gap: SPACING.md,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 20,
  },
  titleArea: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
  },
  name: {
    fontSize: 20,
    lineHeight: 24,
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
    flexWrap: 'wrap',
    gap: SPACING.sm,
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
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  timeBtn: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  timeBtnText: {
    fontSize: 20,
    fontWeight: '800',
  },
  spentChip: {
    paddingVertical: SPACING.sm,
  },
  spentText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  moveLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
    marginLeft: 'auto',
  },
  moveGroup: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  moveBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: APP_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveText: {
    fontSize: 20,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDeleteText: {
    fontSize: 20,
    lineHeight: 20,
    color: APP_COLORS.delete,
    fontWeight: '700',
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
    fontWeight: '600',
  },
});
