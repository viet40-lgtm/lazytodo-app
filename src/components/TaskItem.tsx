import { memo, useCallback, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  APP_COLORS,
  RADIUS,
  SPACING,
  softShadow,
} from '../constants';
import type { Recurring, Task, TaskSection } from '../types';
import { minutesForSection } from '../utils/periodTotals';
import { hasRecurring, normalizeRecurring } from '../utils/recurringList';
import { recurringLabelShort } from '../utils/series';

import { formatDuration } from '../utils/time';

interface TaskItemProps {
  task: Task;
  listSection: TaskSection;
  accentColor: string;
  accentSoft: string;
  trackColor: string;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onLogTime: (id: string, minutes: number) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onManageSubtasks?: (taskId: string) => void;
}

function recurringLabel(recurring?: Task['recurring']): string | null {
  if (!recurring?.length) return null;
  return recurringLabelShort(recurring);
}

// Maps a Recurring value to the TaskSection used for time-range queries.
const RECURRING_TO_SECTION: Record<Recurring, TaskSection> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
};

const STAT_LABEL: Record<TaskSection, string> = {
  today: 'T:',
  daily: 'D:',
  weekly: 'W:',
  monthly: 'M:',
  yearly: 'Y:',
};

/** Returns per-period time stats for a persistent habit task. */
function getHabitStats(task: Task): { label: string; mins: number; section: TaskSection }[] {
  if (!hasRecurring(task)) return [];
  return [
    { label: 'W:', mins: minutesForSection(task, 'weekly'), section: 'weekly' },
    { label: 'M:', mins: minutesForSection(task, 'monthly'), section: 'monthly' },
    { label: 'Y:', mins: minutesForSection(task, 'yearly'), section: 'yearly' },
  ];
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
  listSection,
  accentColor,
  accentSoft,
  trackColor,
  onToggle,
  onEdit,
  onDelete,
  onLogTime,
  onReorder,
  onManageSubtasks,
}: TaskItemProps) {
  // Hide the recurring chip when the stats row is visible — it already shows the periods.
  const showsStatsRow = hasRecurring(task);
  const repeat = showsStatsRow ? null : recurringLabel(task.recurring);
  const done = task.completed;
  const hasMeta = Boolean(task.reminder || repeat);

  // Center timer source:
  // - Persistent habits → sum of ALL timeLogs entries (same source as D/W/M/Y stats,
  //   just without a date filter). This guarantees Y: can never exceed the center total.
  // - Non-persistent recurring → this period's timeLogs only (minutesForSection)
  // - Regular tasks → spentMinutes
  const allTimeLogMins = (task.persistent && task.timeLogs?.length)
    ? task.timeLogs.reduce((sum, log) => sum + log.minutes, 0)
    : null;
  const sectionMins = (hasRecurring(task) && !task.persistent)
    ? minutesForSection(task, listSection)
    : 0;
  const displayTime = task.persistent && allTimeLogMins !== null
    ? formatDuration(allTimeLogMins)
    : hasRecurring(task) && !task.persistent
      ? sectionMins > 0 ? formatDuration(sectionMins) : '—'
      : formatDuration(task.spentMinutes);

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }, done && styles.cardDone]}>
      {/* 1st line: +5, +30m, arrow up, x */}
      <View style={styles.row1}>
        <View style={styles.row1Left}>
          <View style={styles.timeBtnGroup}>
            {onManageSubtasks && (
              <Pressable
                style={[
                  styles.timeBtn,
                  { backgroundColor: (task.subtasks && task.subtasks.length > 0) ? APP_COLORS.headerBg : accentSoft }
                ]}
                onPress={() => onManageSubtasks?.(task.id)}
                hitSlop={4}
              >
                <Text style={[
                  styles.timeBtnText,
                  { color: (task.subtasks && task.subtasks.length > 0) ? '#FFFFFF' : accentColor }
                ]}>Sub-T</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.timeBtn, { backgroundColor: accentSoft }]}
              onPress={() => onLogTime(task.id, 5)}
              hitSlop={4}
            >
              <Text style={[styles.timeBtnText, { color: accentColor }]}>+5m</Text>
            </Pressable>
            <Pressable
              style={[styles.timeBtn, { backgroundColor: accentSoft }]}
              onPress={() => onLogTime(task.id, 30)}
              hitSlop={4}
            >
              <Text style={[styles.timeBtnText, { color: accentColor }]}>+30m</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.row1Right}>
          <View style={styles.corner}>
            <View style={styles.sortArrows}>
              <Pressable hitSlop={8} style={styles.sortArrowBtn} onPress={() => onReorder(task.id, 'up')}>
                <Text style={styles.arrowText}>↑</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.webDelete}
              onPress={() => onDelete(task.id)}
              accessibilityLabel={`Delete ${task.name}`}
              hitSlop={6}
            >
              <Text style={styles.webDeleteText}>X</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 2nd line: check off circle, name */}
      <View style={styles.row2}>
        <Pressable
          style={[
            styles.checkbox,
            { borderColor: APP_COLORS.primary },
            done && { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
          ]}
          onPress={() => onToggle(task)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          hitSlop={8}
        >
          {done ? <Text style={styles.checkmark}>✓</Text> : null}
        </Pressable>

        <Pressable style={styles.titleArea} onPress={() => onEdit(task)}>
          <Text style={[styles.name, done && styles.nameDone]}>
            {task.name}
          </Text>
        </Pressable>
      </View>

      {/* Bottom line: stats on the left, date/time reminder on the right */}
      <View style={styles.bottomRow}>
        {/* Left side: Daily stat only */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={[styles.statLabel, { fontSize: 22, color: APP_COLORS.primary, fontWeight: '700' }]}>
              D:
            </Text>
            <Text style={[styles.statValue, { fontSize: 22, color: APP_COLORS.primary, fontWeight: '800' }]}>
              {formatDuration(hasRecurring(task) ? minutesForSection(task, 'daily') : task.spentMinutes)}
            </Text>
          </View>
        </View>

        {/* Right side: W/M/Y stats and reminders */}
        <View style={styles.bottomRowRight}>
          {/* Other stats (W/M/Y) */}
          {showsStatsRow && (
            <View style={styles.otherStatsRow}>
              {getHabitStats(task).map(({ label, mins, section }) => (
                <View
                  key={section}
                  style={[
                    styles.statChip,
                    section === listSection && { borderColor: accentColor },
                  ]}
                >
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={[styles.statValue, mins > 0 && { color: accentColor }]}>
                    {formatDuration(mins)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Reminder / metadata on the right */}
          {hasMeta && (
            <View style={styles.metaContainer}>
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
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function TaskItemBase(props: TaskItemProps) {
  return <TaskRow {...props} />;
}

export const TaskItem = memo(TaskItemBase);

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
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  row1Left: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  row1Center: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  row1Right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  dateLabel: {
    fontSize: 23,
    fontWeight: '600',
    color: APP_COLORS.textSubtle,
    minWidth: 45,
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
    fontSize: 32,
    fontWeight: '900',
    color: APP_COLORS.delete,
    lineHeight: 32,
    marginTop: -4,
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
    color: APP_COLORS.textMuted,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
    gap: SPACING.xs,
  },
  bottomRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  otherStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  metaRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  metaChip: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 23,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  timeBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeBtn: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: SPACING.sm,
  },
  timeBtnText: {
    fontSize: 23,
    fontWeight: '700',
  },
  spentChip: {
    paddingVertical: SPACING.sm,
  },
  spentText: {
    fontSize: 23,
    fontWeight: '700',
    color: APP_COLORS.primary,
  },
  reminderDateRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  corner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 1,
  },
  createdText: {
    fontSize: 23,
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
    fontSize: 23,
    lineHeight: 25,
    color: APP_COLORS.delete,
    fontWeight: '700',
    marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginTop: 2,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statLabel: {
    fontSize: 20,
    fontWeight: '500',
    color: APP_COLORS.textSubtle,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
});

