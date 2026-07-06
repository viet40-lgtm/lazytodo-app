import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../src/components/AppHeader';
import { AuthModal } from '../src/components/AuthModal';
import { CompletedModal } from '../src/components/CompletedModal';
import { ConfirmModal } from '../src/components/ConfirmModal';
import { CompletionCelebration } from '../src/components/CompletionCelebration';
import { Quote } from '../src/components/Quote';
import { SettingsModal } from '../src/components/SettingsModal';
import { TaskList } from '../src/components/TaskList';
import { TaskModal } from '../src/components/TaskModal';
import { SubtaskModal } from '../src/components/SubtaskModal';
import { APP_COLORS, FAB_SIZE, RADIUS, SCREEN_PADDING, SPACING } from '../src/constants';
import { getRandomQuote } from '../src/data/quotes';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useTasks } from '../src/hooks/useTasks';
import type { AppState, Recurring, SubTask, Task, TaskSection } from '../src/types';
import { hasRecurring, taskShowsInSection } from '../src/utils/recurringList';

const HOME_SECTIONS: TaskSection[] = ['daily', 'today', 'weekly', 'monthly', 'yearly'];

export default function HomeScreen() {
  const [quote] = useState(getRandomQuote);
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultSection, setDefaultSection] = useState<TaskSection>('today');
  const [manageSubtasksId, setManageSubtasksId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const auth = useAuth();
  const { auth: authParam } = useLocalSearchParams<{ auth?: string }>();

  // Auto-open auth modal if navigated here with ?auth=1 (e.g. from landing page Sign In).
  // Only open if the user isn't already logged in.
  useEffect(() => {
    if (authParam === '1' && auth.configured && !auth.userId) {
      setAuthOpen(true);
    }
  }, [authParam, auth.configured, auth.userId]);

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
    skipTask,
    reorderTask,
    toggleSubtask,
    markCelebrated,
    loadFromBackup,
    forceSync,
  } = useTasks(auth.userId);

  const handleRestoreBackup = (restored: AppState) => {
    loadFromBackup(restored);
    setSettingsOpen(false);
  };

  const { todayTasks, dailyTasks, weeklyTasks, monthlyTasks, yearlyTasks } = useMemo(() => {
    const now = Date.now();
    const buckets: Record<TaskSection, Task[]> = {
      today: [],
      daily: [],
      weekly: [],
      monthly: [],
      yearly: [],
    };

    for (const task of tasks) {
      for (const section of HOME_SECTIONS) {
        if (taskShowsInSection(task, section, now)) {
          buckets[section].push(task);
        }
      }
    }

    return {
      todayTasks: buckets.today,
      dailyTasks: buckets.daily,
      weeklyTasks: buckets.weekly,
      monthlyTasks: buckets.monthly,
      yearlyTasks: buckets.yearly,
    };
  }, [tasks]);

  useEffect(() => {
    if (allDone && !celebratedToday) {
      markCelebrated();
    }
  }, [allDone, celebratedToday, markCelebrated]);

  const handleSave = useCallback((data: {
    name: string;
    section: TaskSection;
    reminder?: string;
    recurring?: Recurring[];
    persistent?: boolean;
    reminderOnly?: boolean;
  }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  }, [editingTask, updateTask, addTask]);

  const openAdd = useCallback((section: TaskSection = 'today') => {
    setEditingTask(null);
    setDefaultSection(section);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setDefaultSection(task.section);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleSaveSubtasks = useCallback((taskId: string, subtasks: SubTask[]) => {
    updateTask(taskId, { subtasks: subtasks.length > 0 ? subtasks : undefined });
  }, [updateTask]);

  const handleToggle = useCallback(
    (task: Task) => {
      // Persistent habits just toggle completed — no "remove repeat?" prompt.
      if (hasRecurring(task) && !task.persistent) {
        setRemoveConfirmId(task.id);
        return;
      }
      toggleTask(task.id);
    },
    [toggleTask],
  );

  const confirmRemoveRepeat = useCallback(() => {
    if (removeConfirmId) deleteTask(removeConfirmId);
    setRemoveConfirmId(null);
  }, [removeConfirmId, deleteTask]);

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
        onAccountPress={() => {
          if (auth.userId) forceSync();
          setAuthOpen(true);
        }}
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
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={deleteTask}
          onSkip={skipTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          onManageSubtasks={setManageSubtasksId}
          emptyText="Things you do every day."
        />
        <TaskList
          section="today"
          title="Today"
          tasks={todayTasks}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={deleteTask}
          onSkip={skipTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          onManageSubtasks={setManageSubtasksId}
          emptyText="No tasks yet. Tap + when you're ready."
        />
        <TaskList
          section="weekly"
          title="Week"
          tasks={weeklyTasks}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={deleteTask}
          onSkip={skipTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          onManageSubtasks={setManageSubtasksId}
          emptyText="Bigger stuff for this week."
        />
        <TaskList
          section="monthly"
          title="Month"
          tasks={monthlyTasks}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={deleteTask}
          onSkip={skipTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          onManageSubtasks={setManageSubtasksId}
          emptyText="Tasks for this month."
        />
        <TaskList
          section="yearly"
          title="Year"
          tasks={yearlyTasks}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={deleteTask}
          onSkip={skipTask}
          onLogTime={logTime}
          onReorder={reorderTask}
          onToggleSubtask={toggleSubtask}
          emptyText="Long-term tasks. No rush."
        />
        <Quote text={quote} />
        <Pressable style={styles.completedBtn} onPress={() => setCompletedOpen(true)}>
          <Text style={styles.completedBtnText}>View Completed</Text>
        </Pressable>
        <Pressable style={styles.settingsBtn} onPress={() => setSettingsOpen(true)}>
          <Text style={styles.settingsBtnText}>⚙️  Settings</Text>
        </Pressable>
        <CompletionCelebration show={allDone} />
      </ScrollView>
      <TaskModal
        visible={modalOpen}
        task={editingTask}
        defaultSection={defaultSection}
        onSave={handleSave}
        onClose={closeModal}
      />
      <SubtaskModal
        visible={!!manageSubtasksId}
        task={manageSubtasksId ? tasks.find(t => t.id === manageSubtasksId) || null : null}
        onSave={handleSaveSubtasks}
        onLogTime={logTime}
        onClose={() => setManageSubtasksId(null)}
      />
      <AuthModal
        visible={authOpen}
        cancellable
        configured={auth.configured}
        email={auth.email}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        onSignOut={auth.signOut}
        onClose={() => setAuthOpen(false)}
      />
      <CompletedModal
        visible={completedOpen}
        tasks={tasks}
        onClose={() => setCompletedOpen(false)}
        onDelete={deleteTask}
      />
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onRestore={handleRestoreBackup}
      />
      <ConfirmModal
        visible={removeConfirmId !== null}
        title="Remove repeat task?"
        message="Are you sure you want to remove this repeat task?"
        confirmLabel="Yes"
        cancelLabel="Cancel"
        onConfirm={confirmRemoveRepeat}
        onCancel={() => setRemoveConfirmId(null)}
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
  completedBtn: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    borderWidth: 0,
  },
  completedBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsBtn: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: APP_COLORS.border,
  },
  settingsBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
});
