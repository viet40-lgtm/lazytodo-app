import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  APP_COLORS,
  RADIUS,
  SPACING,
  softShadow,
} from '../constants';
import type { Recurring, Task, TaskSection } from '../types';
import {
  minutesForSectionIncludingSubtasks,
  totalMinutesIncludingSubtasks,
} from '../utils/periodTotals';
import { hasRecurring, normalizeRecurring } from '../utils/recurringList';
import { recurringLabelShort } from '../utils/series';

import { formatDuration } from '../utils/time';
import { playLongBeep } from '../utils/sound';

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

/** Returns per-period time stats for checked recurring options (weekly, monthly, yearly). */
function getHabitStats(task: Task): { label: string; mins: number; section: TaskSection }[] {
  const repeats = normalizeRecurring(task.recurring);
  if (repeats.length === 0) return [];

  const stats: { label: string; mins: number; section: TaskSection }[] = [];
  if (repeats.includes('weekly')) {
    stats.push({ label: 'W:', mins: minutesForSectionIncludingSubtasks(task, 'weekly'), section: 'weekly' });
  }
  if (repeats.includes('monthly')) {
    stats.push({ label: 'M:', mins: minutesForSectionIncludingSubtasks(task, 'monthly'), section: 'monthly' });
  }
  if (repeats.includes('yearly')) {
    stats.push({ label: 'Y:', mins: minutesForSectionIncludingSubtasks(task, 'yearly'), section: 'yearly' });
  }
  return stats;
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
  const repeats = normalizeRecurring(task.recurring);
  const showDaily = repeats.includes('daily');
  const habitStats = getHabitStats(task);
  const repeat = recurringLabel(task.recurring);
  const done = task.completed;
  const hasMeta = Boolean(task.reminder);

  const [isTiming, setIsTiming] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const loggedMinutesRef = useRef(0);
  const onLogTimeRef = useRef(onLogTime);
  onLogTimeRef.current = onLogTime;
  const taskIdRef = useRef(task.id);
  taskIdRef.current = task.id;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleToggleTimer = () => {
    if (isTiming) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsTiming(false);
      const unloggedSeconds = secondsRef.current - loggedMinutesRef.current * 60;
      if (unloggedSeconds >= 30 || (loggedMinutesRef.current === 0 && unloggedSeconds > 0)) {
        onLogTimeRef.current(taskIdRef.current, 1);
      }
      loggedMinutesRef.current = 0;
      secondsRef.current = 0;
      setElapsedSeconds(0);
    } else {
      setIsTiming(true);
      secondsRef.current = 0;
      setElapsedSeconds(0);
      loggedMinutesRef.current = 0;
      intervalRef.current = setInterval(() => {
        secondsRef.current += 1;
        const currentSecs = secondsRef.current;
        setElapsedSeconds(currentSecs);
        if (currentSecs > 0 && currentSecs % 60 === 0) {
          playLongBeep(1.0);
          onLogTimeRef.current(taskIdRef.current, 1);
          loggedMinutesRef.current += 1;
        }
      }, 1000);
    }
  };

  const formatTimerDisplay = (sec: number) => {
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  // Center timer source:
  // - Persistent habits → sum of ALL timeLogs entries (same source as D/W/M/Y stats,
  //   just without a date filter). This guarantees Y: can never exceed the center total.
  // - Non-persistent recurring → this period's timeLogs only (minutesForSection)
  // - Regular tasks → spentMinutes
  const allTimeLogMins = task.persistent
    ? totalMinutesIncludingSubtasks(task)
    : null;
  const sectionMins = (hasRecurring(task) && !task.persistent)
    ? minutesForSectionIncludingSubtasks(task, listSection)
    : 0;
  const displayTime = task.persistent && allTimeLogMins !== null
    ? formatDuration(allTimeLogMins)
    : hasRecurring(task) && !task.persistent
      ? sectionMins > 0 ? formatDuration(sectionMins) : '—'
      : formatDuration(task.spentMinutes);

  const renderCornerActions = () => (
    <View style={styles.corner}>
      <View style={styles.sortArrows}>
        <Pressable hitSlop={8} style={styles.sortArrowBtn} onPress={() => onReorder(task.id, 'up')}>
          <Text style={styles.arrowText}>↑</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { borderColor: accentColor, borderLeftColor: accentColor }, done && styles.cardDone]}>
      {!task.reminderOnly && (
        <View style={styles.row1}>
          <View style={styles.row1Left}>
            <View style={styles.timeBtnGroup}>
              <Pressable
                style={[styles.timeBtn, { backgroundColor: accentSoft }]}
                onPress={() => onLogTime(task.id, 5)}
                hitSlop={4}
              >
                <Text style={[styles.timeBtnText, { color: accentColor }]}>+5m</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.timeBtn,
                  isTiming
                    ? { backgroundColor: APP_COLORS.primary }
                    : { backgroundColor: accentSoft },
                ]}
                onPress={handleToggleTimer}
                hitSlop={4}
              >
                <Text
                  style={[
                    styles.timeBtnText,
                    isTiming ? { color: '#FFFFFF' } : { color: accentColor },
                  ]}
                >
                  {isTiming ? formatTimerDisplay(elapsedSeconds) : 'Timer'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.row1Right}>
            {showDaily && (
              <View style={styles.statChip}>
                <Text style={[styles.statLabel, { fontSize: 30, color: APP_COLORS.primary, fontWeight: '700' }]}>D:</Text>
                <Text style={[styles.statValue, { fontSize: 30, color: APP_COLORS.primary, fontWeight: '800' }]}> 
                  {formatDuration(minutesForSectionIncludingSubtasks(task, 'daily'))}
                </Text>
              </View>
            )}
            {!showDaily && listSection !== 'today' && hasRecurring(task) ? (
              <View style={styles.statChip}>
                <Text style={[styles.statLabel, { fontSize: 30, color: APP_COLORS.primary, fontWeight: '700' }]}> 
                  {STAT_LABEL[listSection]}
                </Text>
                <Text style={[styles.statValue, { fontSize: 30, color: APP_COLORS.primary, fontWeight: '800' }]}> 
                  {formatDuration(minutesForSectionIncludingSubtasks(task, listSection))}
                </Text>
              </View>
            ) : null}
            {renderCornerActions()}
          </View>
        </View>
      )}

      {/* 2nd line: name, subtasks button */}
      <View style={styles.row2}>
        <Pressable style={styles.titleArea} onPress={() => onEdit(task)}>
          <Text style={[styles.name, done && styles.nameDone]}>
            {task.name}
          </Text>
        </Pressable>
        {onManageSubtasks && !task.reminderOnly ? (
          <Pressable
            style={[
              styles.timeBtn,
              styles.subtaskBtn,
              { backgroundColor: (task.subtasks && task.subtasks.length > 0) ? APP_COLORS.headerBg : accentSoft },
            ]}
            onPress={() => onManageSubtasks?.(task.id)}
            hitSlop={4}
          >
            <Text style={[
              styles.timeBtnText,
              { color: (task.subtasks && task.subtasks.length > 0) ? '#FFFFFF' : accentColor },
            ]}>Sub-T</Text>
          </Pressable>
        ) : null}
      </View>

      {(hasMeta || task.reminderOnly) && (
        <View style={styles.metaContainer}>
          <Pressable style={styles.metaRowContent} onPress={() => onEdit(task)}>
            {task.reminder ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{formatReminder(task.reminder)}</Text>
              </View>
            ) : null}
          </Pressable>
          {task.reminderOnly ? renderCornerActions() : null}
        </View>
      )}
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
    borderWidth: 1.5,
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
    flexWrap: 'nowrap',
    width: '100%',
    rowGap: SPACING.xs,
  },
  row1Left: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexShrink: 1,
    minWidth: 0,
  },
  row1Center: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  row1Right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: 7,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  dateLabel: {
    fontSize: 30,
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
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: -2,
  },
  sortArrows: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 30,
    fontWeight: '900',
    color: APP_COLORS.delete,
    lineHeight: 29,
    marginTop: -4,
  },
  titleArea: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
  },
  name: {
    fontSize: 30,
    lineHeight: 25,
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
    flexWrap: 'wrap',
    width: '100%',
    marginTop: -4,
    gap: SPACING.xs,
  },
  bottomRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    maxWidth: '100%',
    gap: SPACING.md,
  },
  otherStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: SPACING.sm,
  },
  metaRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
  },
  metaChip: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  metaText: {
    fontSize: 30,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
    flexShrink: 1,
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
    flexWrap: 'nowrap',
    gap: 7,
  },
  timeBtn: {
    borderRadius: RADIUS.pill,
    padding: 5,
  },
  timeBtnText: {
    fontSize: 30,
    fontWeight: '700',
  },
  repeatChip: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  repeatText: {
    fontSize: 30,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
  subtaskBtn: {
    marginLeft: 'auto',
  },
  spentChip: {
    paddingVertical: SPACING.sm,
  },
  spentText: {
    fontSize: 30,
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
    gap: 7,
    marginTop: 1,
  },
  createdText: {
    fontSize: 30,
    fontWeight: '600',
    color: APP_COLORS.textSubtle,
  },

  webDelete: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDeleteText: {
    fontSize: 30,
    lineHeight: 22,
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
    fontSize: 30,
    fontWeight: '500',
    color: APP_COLORS.textSubtle,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
});

