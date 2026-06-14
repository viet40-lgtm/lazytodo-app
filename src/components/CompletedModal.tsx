import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING } from '../constants';
import type { Task } from '../types';

interface CompletedModalProps {
  visible: boolean;
  tasks: Task[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function CompletedModal({ visible, tasks, onClose, onDelete }: CompletedModalProps) {
  const [limit, setLimit] = useState(20);

  // Filter and sort completed tasks by newest first
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.completed && !t.deleted).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [tasks]
  );
  const displayedTasks = completedTasks.slice(0, limit);
  const hasMore = limit < completedTasks.length;

  const handleClose = () => {
    setLimit(20); // Reset limit on close
    onClose();
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
          {completedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No completed tasks yet.</Text>
          ) : (
            displayedTasks.map((task) => {
              const dateObj = new Date(task.completedAt ?? task.createdAt);
              const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskName}>{task.name}</Text>
                    <Text style={styles.taskDate}>Finished {dateStr}</Text>
                  </View>
                  <Pressable style={styles.deleteBtn} onPress={() => onDelete(task.id)} hitSlop={8}>
                    <Text style={styles.deleteText}>X</Text>
                  </Pressable>
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.text,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDate: {
    fontSize: 18,
    color: APP_COLORS.textSubtle,
    marginTop: 4,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: APP_COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
  deleteText: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.delete,
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
