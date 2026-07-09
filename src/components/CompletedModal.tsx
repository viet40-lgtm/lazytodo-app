import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, getSectionTheme } from '../constants';
import type { Task, TaskSection } from '../types';

interface CompletedModalProps {
  visible: boolean;
  tasks: Task[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onDeleteSubtask?: (parentTaskId: string, subtaskId: string) => void;
}

export function CompletedModal({ visible, tasks, onClose, onDelete, onDeleteSubtask }: CompletedModalProps) {
  const [limit, setLimit] = useState(20);

  // Gather completed tasks and completed sub-tasks, sorted by completion date
  const completedItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'task' | 'subtask';
      name: string;
      createdAt: number;
      completedAt: number;
      parentTaskId?: string;
      parentName?: string;
      section: TaskSection;
    }> = [];

    tasks.forEach((task) => {
      if (task.deleted) return;

      if (task.completed) {
        items.push({
          id: task.id,
          type: 'task',
          name: task.name,
          createdAt: task.createdAt,
          completedAt: task.completedAt ?? Date.now(),
          section: task.section,
        });
      }

      if (task.subtasks) {
        task.subtasks.forEach((subtask) => {
          if (subtask.completed) {
            items.push({
              id: subtask.id,
              type: 'subtask',
              name: subtask.name,
              createdAt: subtask.createdAt ?? task.createdAt,
              completedAt: subtask.completedAt ?? Date.now(),
              parentTaskId: task.id,
              parentName: task.name,
              section: task.section,
            });
          }
        });
      }
    });

    return items.sort((a, b) => b.completedAt - a.completedAt);
  }, [tasks]);

  const displayedItems = completedItems.slice(0, limit);
  const hasMore = limit < completedItems.length;

  const handleClose = () => {
    setLimit(20); // Reset limit on close
    onClose();
  };

  const handleDelete = (item: typeof completedItems[0]) => {
    if (item.type === 'task') {
      onDelete(item.id);
    } else if (item.type === 'subtask' && item.parentTaskId) {
      onDeleteSubtask?.(item.parentTaskId, item.id);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Completed</Text>
          <Pressable style={styles.closeBtn} onPress={handleClose} accessibilityLabel="Close" hitSlop={8}>
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {completedItems.length === 0 ? (
            <Text style={styles.emptyText}>No completed tasks yet.</Text>
          ) : (
            displayedItems.map((item) => {
              const startObj = new Date(item.createdAt);
              const startStr = `${startObj.getMonth() + 1}/${startObj.getDate()}/${startObj.getFullYear()}`;
              const finishObj = new Date(item.completedAt);
              const finishStr = `${finishObj.getMonth() + 1}/${finishObj.getDate()}/${finishObj.getFullYear()}`;
              return (
                <View key={`${item.type}-${item.id}`} style={[styles.taskCard, { borderLeftColor: getSectionTheme(item.section).accent }]}>
                  <View style={styles.taskInfo}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.taskDate}>
                        {startStr} - {finishStr}
                      </Text>
                      <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item)} hitSlop={8}>
                        <Text style={styles.deleteText}>X</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.taskName}>
                      {item.type === 'subtask' && item.parentName
                        ? `${item.name} (${item.parentName})`
                        : item.name}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {hasMore ? (
            <Pressable style={styles.moreBtn} onPress={() => setLimit((prev) => prev + 20)}>
              <Text style={styles.moreText}>Load More</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: APP_COLORS.headerBg,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -2,
  },
  content: {
    padding: SCREEN_PADDING,
    gap: SPACING.md,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 20,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  taskCard: {
    backgroundColor: APP_COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
  },
  taskInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  taskName: {
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.text,
    opacity: 0.6,
    marginTop: 8,
  },
  taskDate: {
    fontSize: 20,
    color: '#000000',
    flex: 1,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
  deleteText: {
    fontSize: 23,
    lineHeight: 25,
    color: APP_COLORS.delete,
    fontWeight: '700',
    marginTop: -2,
  },
  moreBtn: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  moreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
