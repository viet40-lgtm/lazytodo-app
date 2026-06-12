import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../src/components/AppHeader';
import { AuthModal } from '../src/components/AuthModal';
import { CompletionCelebration } from '../src/components/CompletionCelebration';
import { FloatingButton } from '../src/components/FloatingButton';
import { Quote } from '../src/components/Quote';
import { TaskList } from '../src/components/TaskList';
import { TaskModal } from '../src/components/TaskModal';
import { APP_COLORS, FAB_SIZE, SCREEN_PADDING } from '../src/constants';
import { getRandomQuote } from '../src/data/quotes';
import { useAuth } from '../src/hooks/useAuth';
import { useTasks } from '../src/hooks/useTasks';
import type { Recurring, Task, TaskSection } from '../src/types';

export default function HomeScreen() {
  const [quote] = useState(getRandomQuote);
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultSection, setDefaultSection] = useState<TaskSection>('today');

  const auth = useAuth();

  const {
    hydrated,
    syncing,
    tasks,
    allDone,
    celebratedToday,
    addTask,
    updateTask,
    logTime,
    toggleTask,
    deleteTask,
    reorderTask,
    markCelebrated,
  } = useTasks(auth.userId);

  const todayTasks = useMemo(() => tasks.filter((task) => task.section === 'today'), [tasks]);
  const dailyTasks = useMemo(() => tasks.filter((task) => task.section === 'daily'), [tasks]);
  const weeklyTasks = useMemo(() => tasks.filter((task) => task.section === 'weekly'), [tasks]);
  const monthlyTasks = useMemo(() => tasks.filter((task) => task.section === 'monthly'), [tasks]);
  const yearlyTasks = useMemo(() => tasks.filter((task) => task.section === 'yearly'), [tasks]);

  useEffect(() => {
    if (allDone && !celebratedToday) {
      markCelebrated();
    }
  }, [allDone, celebratedToday, markCelebrated]);

  const handleSave = (data: {
    name: string;
    section: TaskSection;
    reminder?: string;
    recurring?: Recurring;
  }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  const openAdd = (section: TaskSection = 'today') => {
    setEditingTask(null);
    setDefaultSection(section);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDefaultSection(task.section);
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
      <AppHeader
        onAccountPress={() => setAuthOpen(true)}
        onAddPress={() => openAdd('today')}
        loggedIn={Boolean(auth.userId)}
        syncing={syncing}
        showAccount={auth.configured}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TaskList
          section="daily"
          title="Daily"
          tasks={dailyTasks}
          onToggle={toggleTask}
          onEdit={openEdit}
          onDelete={deleteTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          emptyText="Things you do every day."
        />
        <TaskList
          section="today"
          title="Today"
          tasks={todayTasks}
          onToggle={toggleTask}
          onEdit={openEdit}
          onDelete={deleteTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          emptyText="No goals yet. Tap + when you're ready."
        />
        <TaskList
          section="weekly"
          title="Week"
          tasks={weeklyTasks}
          onToggle={toggleTask}
          onEdit={openEdit}
          onDelete={deleteTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          emptyText="Bigger stuff for this week."
        />
        <TaskList
          section="monthly"
          title="Month"
          tasks={monthlyTasks}
          onToggle={toggleTask}
          onEdit={openEdit}
          onDelete={deleteTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          emptyText="Goals for this month."
        />
        <TaskList
          section="yearly"
          title="Year"
          tasks={yearlyTasks}
          onToggle={toggleTask}
          onEdit={openEdit}
          onDelete={deleteTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          emptyText="Long-term goals. No rush."
        />
        <Quote text={quote} />
        <CompletionCelebration show={allDone} />
      </ScrollView>
      <TaskModal
        visible={modalOpen}
        task={editingTask}
        defaultSection={defaultSection}
        onSave={handleSave}
        onClose={closeModal}
      />
      <AuthModal
        visible={authOpen}
        configured={auth.configured}
        email={auth.email}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onSignOut={auth.signOut}
        onClose={() => setAuthOpen(false)}
      />
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SCREEN_PADDING,
    paddingBottom: SCREEN_PADDING + FAB_SIZE + SCREEN_PADDING,
    gap: 24,
    width: '100%',
  },
});
