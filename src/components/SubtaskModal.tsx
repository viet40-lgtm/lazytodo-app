import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SPACING, softShadow, SCREEN_PADDING, getSectionTheme } from '../constants';
import type { SubTask, Task, TaskSection } from '../types';
import { nanoid } from 'nanoid/non-secure';
import { formatDuration } from '../utils/time';
import { minutesForTimeLogs } from '../utils/periodTotals';

interface SubtaskModalProps {
  visible: boolean;
  task: Task | null;
  onSave: (taskId: string, subtasks: SubTask[]) => void;
  onLogTime?: (taskId: string, mins: number) => void;
  onClose: () => void;
}

const SUBTASK_STAT_SECTIONS: { label: string; section: TaskSection }[] = [
  { label: 'W:', section: 'weekly' },
  { label: 'M:', section: 'monthly' },
  { label: 'Y:', section: 'yearly' },
];

export function SubtaskModal({ visible, task, onSave, onLogTime, onClose }: SubtaskModalProps) {
  function formatDate(ts?: number) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && task) {
      const initial = task.subtasks ?? [];
      const active = initial.filter(st => !st.completed);
      setSubtasks(active);
      setInput('');
    }
  }, [visible, task?.id]);

  const originalSubtasks = task?.subtasks ?? [];
  const initialActive = originalSubtasks.filter(st => !st.completed);
  const normalizedInitial = initialActive;
  
  const hasChanges = subtasks.length !== normalizedInitial.length || subtasks.some((st, i) => {
    const init = normalizedInitial[i];
    return st.id !== init.id ||
           st.name !== init.name ||
           st.completed !== init.completed ||
           st.timeSpent !== init.timeSpent ||
           st.createdAt !== init.createdAt ||
           st.completedAt !== init.completedAt;
  });

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    setSubtasks([...subtasks, { 
      id: nanoid(), 
      name: text, 
      completed: false,
      createdAt: Date.now(),
      timeSpent: 0
    }]);
    setInput('');
  };

  const handleEditName = (id: string, newName: string) => {
    setSubtasks((prev) => prev.map(st => 
      st.id === id ? { ...st, name: newName } : st
    ));
  };

  const handleRemove = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleToggle = (id: string) => {
    setSubtasks((prev) => {
      const target = prev.find(st => st.id === id);
      if (!target) return prev;
      const isCompleting = !target.completed;
      const updated = {
        ...target,
        completed: isCompleting,
        completedAt: isCompleting ? Date.now() : undefined,
      };
      const others = prev.filter(st => st.id !== id);
      if (isCompleting) return [...others, updated];
      const active = others.filter(st => !st.completed);
      const completed = others.filter(st => st.completed);
      return [...active, updated, ...completed];
    });
  };

  const handleMoveUp = (id: string) => {
    const idx = subtasks.findIndex(st => st.id === id);
    if (idx > 0) {
      const next = [...subtasks];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setSubtasks(next);
    }
  };

  const handleLogTime = (id: string, mins: number) => {
    // Only update local state — Save button commits to cloud.
    // onLogTime still fires immediately so the parent task timer advances.
    const at = Date.now();
    setSubtasks((prev) =>
      prev.map(st => st.id === id ? {
        ...st,
        timeSpent: (st.timeSpent || 0) + mins,
        timeLogs: [...(st.timeLogs ?? []), { at, minutes: mins }],
      } : st)
    );
    if (task && onLogTime) {
      onLogTime(task.id, mins);
    }
  };

  const handleSave = () => {
    if (!task) return;
    onSave(task.id, subtasks.length > 0 ? subtasks : []);
    onClose();
  };

  if (!task) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{task.name}</Text>
              <Text style={styles.subtitle}>Sub-tasks</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
              <Pressable 
                style={[styles.headerSaveBtn, hasChanges && { borderColor: APP_COLORS.delete }]} 
                onPress={handleSave} 
                hitSlop={8}
              >
                <Text style={[styles.headerSaveText, hasChanges && { color: APP_COLORS.delete }]}>Save</Text>
              </Pressable>
              <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.subtaskList}>
              {subtasks.map((st) => {
                const theme = getSectionTheme(task.section);
                return (
                  <View key={st.id} style={[styles.subtaskRow, { borderLeftColor: theme.accent }]}>
                    {/* 1st line: +5, +30m, time, arrow up, x */}
                    <View style={styles.row1}>
                      <View style={styles.row1Left}>
                        <View style={styles.timeBtnGroup}>
                          <Pressable
                            style={styles.timeBtn}
                            onPress={() => handleLogTime(st.id, 5)}
                            hitSlop={4}
                          >
                            <Text style={styles.timeBtnText}>+5m</Text>
                          </Pressable>
                          <Pressable
                            style={styles.timeBtn}
                            onPress={() => handleLogTime(st.id, 30)}
                            hitSlop={4}
                          >
                            <Text style={styles.timeBtnText}>+30m</Text>
                          </Pressable>
                        </View>
                      </View>
                      
                      <View style={styles.row1Right}>
                        <View style={styles.corner}>
                          <View style={styles.sortArrows}>
                            <Pressable hitSlop={8} style={styles.sortArrowBtn} onPress={() => handleMoveUp(st.id)}>
                              <Text style={styles.arrowText}>↑</Text>
                            </Pressable>
                          </View>
                          <Pressable style={styles.subtaskDelete} onPress={() => handleRemove(st.id)} hitSlop={8}>
                            <Text style={styles.subtaskDeleteText}>X</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    {/* 2nd line: check off circle, name */}
                    <View style={styles.row2}>
                      <Pressable
                        style={[styles.subtaskCheckbox, st.completed && styles.subtaskCheckboxDone]}
                        onPress={() => handleToggle(st.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: st.completed }}
                      >
                        {st.completed ? <Text style={styles.subtaskCheckmark}>✓</Text> : null}
                      </Pressable>

                      <View style={styles.subtaskNameCol}>
                        <TextInput
                          style={[
                            styles.subtaskName, 
                            styles.subtaskNameInput, 
                            st.completed && styles.subtaskNameDone
                          ]}
                          value={st.name}
                          onChangeText={(text) => handleEditName(st.id, text)}
                          underlineColorAndroid="transparent"
                          multiline={true}
                        />
                      </View>
                    </View>

                    <View style={styles.bottomRow}>
                      <View style={styles.dailyStatRow}>
                        <View style={styles.dailyStatChip}>
                          <Text style={styles.dailyStatLabel}>D:</Text>
                          <Text style={styles.dailyStatValue}>
                            {formatDuration(minutesForTimeLogs(st.timeLogs, 'daily'))}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.otherStatsRow}>
                        {SUBTASK_STAT_SECTIONS.map(({ label, section }) => (
                          <View key={section} style={styles.statChip}>
                            <Text style={styles.statLabel}>{label}</Text>
                            <Text style={styles.statValue}>
                              {formatDuration(minutesForTimeLogs(st.timeLogs, section))}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Add a sub-task..."
                placeholderTextColor={APP_COLORS.textSubtle}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!input.trim()}
              >
                <Text style={styles.addText}>+</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: APP_COLORS.headerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...softShadow(0.18, 16, 6),
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.headerMuted,
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: -2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SCREEN_PADDING,
    paddingTop: 8,
  },
  subtaskList: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  subtaskRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: SCREEN_PADDING,
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    ...softShadow(0.04, 8, 3),
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
  row1Right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    marginTop: SPACING.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.xs,
  },
  dateLabel: {
    fontSize: 23,
    fontWeight: '600',
    color: APP_COLORS.textSubtle,
    minWidth: 45,
  },
  timeBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeBtn: {
    borderRadius: RADIUS.pill,
    backgroundColor: '#cffafe',
    paddingHorizontal: 10,
    paddingVertical: SPACING.sm,
  },
  timeBtnText: {
    fontSize: 23,
    fontWeight: '700',
    color: '#0891b2',
  },
  dailyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dailyStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyStatLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: APP_COLORS.primary,
  },
  dailyStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: APP_COLORS.primary,
  },
  otherStatsRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
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
  createdText: {
    fontSize: 23,
    fontWeight: '600',
    color: APP_COLORS.textSubtle,
  },
  subtaskCheckbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  subtaskCheckboxDone: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  subtaskCheckmark: {
    color: APP_COLORS.primary,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: -2,
  },
  subtaskNameCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    minWidth: 0,
  },
  subtaskName: {
    flex: 1,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '600',
    color: APP_COLORS.text,
    minWidth: 0,
    flexShrink: 1,
    ...Platform.select({
      web: {
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      } as any,
    }),
  },
  subtaskNameInput: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    // @ts-ignore - for web/windows to remove focus outline
    outlineStyle: 'none',
    ...Platform.select({
      web: {
        resize: 'none',
      } as any,
    }),
  },
  subtaskNameDone: {
    color: APP_COLORS.textMuted,
    fontWeight: '500',
  },
  subtaskDate: {
    fontSize: 16,
    color: APP_COLORS.textSubtle,
  },
  corner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 1,
    flexShrink: 0,
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
  subtaskDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskDeleteText: {
    fontSize: 23,
    lineHeight: 25,
    color: APP_COLORS.delete,
    fontWeight: '700',
    marginTop: -2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 22,
    color: '#000',
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.md,
    ...softShadow,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: APP_COLORS.border,
  },
  addText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
  actions: {
    padding: SCREEN_PADDING,
    paddingBottom: Platform.OS === 'ios' ? 0 : SCREEN_PADDING,
    backgroundColor: APP_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  headerSaveBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveText: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  primaryBtn: {
    backgroundColor: APP_COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
