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
import { APP_COLORS, RADIUS, SPACING, softShadow, SCREEN_PADDING } from '../constants';
import type { SubTask, Task } from '../types';
import { nanoid } from 'nanoid/non-secure';

interface SubtaskModalProps {
  visible: boolean;
  task: Task | null;
  onSave: (taskId: string, subtasks: SubTask[]) => void;
  onClose: () => void;
}

export function SubtaskModal({ visible, task, onSave, onClose }: SubtaskModalProps) {
  function formatCompletedDate(ts?: number) {
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
      const completed = initial.filter(st => st.completed);
      setSubtasks([...active, ...completed]);
      setInput('');
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [visible, task]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    setSubtasks([...subtasks, { id: nanoid(), name: text, completed: false }]);
    setInput('');
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
      if (isCompleting) {
        return [...others, updated];
      } else {
        const active = others.filter(st => !st.completed);
        const completed = others.filter(st => st.completed);
        return [...active, updated, ...completed];
      }
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
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.subtaskList}>
              {subtasks.map((st) => (
                <View key={st.id} style={styles.subtaskRow}>
                  <Pressable
                    style={styles.subtaskCheckbox}
                    onPress={() => handleToggle(st.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: st.completed }}
                  >
                    {st.completed ? <Text style={styles.subtaskCheckmark}>✓</Text> : null}
                  </Pressable>
                  <View style={styles.subtaskNameCol}>
                    <Text style={[styles.subtaskName, st.completed && styles.subtaskNameDone]}>
                      {st.name}
                    </Text>
                    {st.completed && st.completedAt ? (
                      <Text style={styles.subtaskDate}>{formatCompletedDate(st.completedAt)}</Text>
                    ) : null}
                  </View>
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
              ))}
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
          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </Pressable>
          </View>
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
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
    borderColor: APP_COLORS.headerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '700',
    color: APP_COLORS.headerMuted,
    marginTop: -4,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: SPACING.md,
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.md,
    gap: SPACING.md,
    ...softShadow,
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
  },
  subtaskName: {
    flex: 1,
    fontSize: 22,
    color: '#000',
  },
  subtaskNameDone: {
    color: APP_COLORS.textSubtle,
    textDecorationLine: 'line-through',
  },
  subtaskDate: {
    fontSize: 16,
    color: APP_COLORS.textSubtle,
  },
  corner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
    fontSize: 25,
    fontWeight: '900',
    color: APP_COLORS.delete,
    lineHeight: 25,
    marginTop: -2,
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
    color: APP_COLORS.delete,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
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
