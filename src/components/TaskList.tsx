import { StyleSheet, Text, View } from 'react-native';
import { APP_COLORS, RADIUS, SPACING, getSectionTheme } from '../constants';
import type { Task, TaskSection } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  section: TaskSection;
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onLogTime: (id: string, minutes: number) => void;
  onMoveSection: (id: string, section: TaskSection) => void;
  emptyText?: string;
}

export function TaskList({
  section,
  title,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onLogTime,
  onMoveSection,
  emptyText = 'Nothing here yet.',
}: TaskListProps) {
  const theme = getSectionTheme(section);
  const isEmpty = tasks.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: theme.accentSoft }]}>
          <Text style={styles.icon}>{theme.icon}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.accent }]}>{title}</Text>
          <Text style={styles.tagline}>{theme.tagline}</Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={[styles.emptyCard, { borderColor: theme.track }]}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              accentColor={theme.accent}
              accentSoft={theme.accentSoft}
              trackColor={theme.track}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onLogTime={onLogTime}
              onMoveSection={onMoveSection}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 18,
    color: APP_COLORS.textSubtle,
    marginTop: 1,
  },
  list: {
    gap: SPACING.sm,
  },
  emptyCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: APP_COLORS.surfaceMuted,
  },
  emptyText: {
    fontSize: 18,
    lineHeight: 24,
    color: APP_COLORS.textMuted,
  },
});
