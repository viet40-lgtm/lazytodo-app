import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompletionCelebration } from '../src/components/CompletionCelebration';
import { FloatingButton } from '../src/components/FloatingButton';
import { ProgressBar } from '../src/components/ProgressBar';
import { Quote } from '../src/components/Quote';
import { TaskList } from '../src/components/TaskList';
import { TaskModal } from '../src/components/TaskModal';
import { APP_COLORS } from '../src/constants';
import { getRandomQuote } from '../src/data/quotes';
import { useTasks } from '../src/hooks/useTasks';
import type { Recurring, Task } from '../src/types';

export default function HomeScreen() {
  const [quote] = useState(getRandomQuote);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    hydrated,
    tasks,
    completedCount,
    totalCount,
    allDone,
    celebratedToday,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    markCelebrated,
  } = useTasks();

  useEffect(() => {
    if (allDone && !celebratedToday) {
      markCelebrated();
    }
  }, [allDone, celebratedToday, markCelebrated]);

  const handleSave = (data: { name: string; reminder?: string; recurring?: Recurring }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  const openAdd = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={APP_COLORS.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Quote text={quote} />
        <ProgressBar completed={completedCount} total={totalCount} />
        <TaskList tasks={tasks} onToggle={toggleTask} onEdit={openEdit} onDelete={deleteTask} />
        <CompletionCelebration show={allDone} />
      </ScrollView>

      <FloatingButton onPress={openAdd} />
      <TaskModal visible={modalOpen} task={editingTask} onSave={handleSave} onClose={closeModal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 28,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
