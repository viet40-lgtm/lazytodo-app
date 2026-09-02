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
import {
  APP_COLORS,
  RADIUS,
  SCREEN_PADDING,
  SECTION_LABELS,
  SECTION_THEMES,
  SPACING,
  softShadow,
} from '../constants';
import type { Recurring, Task, TaskSection } from '../types';
import { normalizeRecurring } from '../utils/recurringList';
import { sectionForReminder } from '../utils/recurringList';
import { formatDuration } from '../utils/time';
import { minutesForSectionIncludingSubtasks } from '../utils/periodTotals';
import { DateTimePickerUI } from './DateTimePickerUI';

interface TaskModalProps {
  visible: boolean;
  task?: Task | null;
  defaultSection?: TaskSection;
  onSave: (data: {
    name: string;
    section: TaskSection;
    reminder?: string;
    recurring?: Recurring[];
    persistent?: boolean;
    reminderOnly?: boolean;
  }) => void;
  onClose: () => void;
  onToggle?: (task: Task) => void;
  onDelete?: (id: string) => void;
}

const SECTION_OPTIONS: TaskSection[] = ['today', 'weekly', 'monthly', 'yearly'];

const REPEAT_OPTIONS: { value: Recurring; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

export function TaskModal({ visible, task, defaultSection = 'today', onSave, onClose, onToggle, onDelete }: TaskModalProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [section, setSection] = useState<TaskSection>(task?.section ?? defaultSection);
  const [reminder, setReminder] = useState(task?.reminder ?? '');
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [reminderOnly, setReminderOnly] = useState(task?.reminderOnly ?? false);
  const [completed, setCompleted] = useState(task?.completed ?? false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setName(task?.name ?? '');
    setSection(task?.section ?? defaultSection);
    setReminder(task?.reminder ?? '');
    const rec = normalizeRecurring(task?.recurring);
    setRecurring(rec);
    setReminderOnly(task?.reminderOnly ?? false);
    setCompleted(task?.completed ?? false);
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [visible, task, defaultSection]);

  // Section is always derived from the reminder date.
  // No date → Today. Date within 7 days → Week. Within 30 → Month. Beyond → Year.
  useEffect(() => {
    if (!reminder) {
      // No date: default to today section.
      setSection('today');
      return;
    }
    const pickedDate = new Date(reminder);
    if (isNaN(pickedDate.getTime())) return;

    setSection(sectionForReminder(reminder));
  }, [reminder]);

  const requiresReminder = false;
  const canSave = Boolean(name.trim()) && (!reminderOnly || Boolean(reminder));
  
  const hasChanges = (
    name !== (task?.name ?? '') ||
    section !== (task?.section ?? defaultSection) ||
    reminder !== (task?.reminder ?? '') ||
    JSON.stringify(recurring) !== JSON.stringify(normalizeRecurring(task?.recurring)) ||
    reminderOnly !== (task?.reminderOnly ?? false)
  );

  const toggleRepeat = (value: Recurring) => {
    setRecurring(recurring.includes(value) ? [] : [value]);
  };

  const handleToggleCompleted = () => {
    if (!task) return;
    setCompleted(!completed);
    onToggle?.(task);
  };

  const handleDelete = () => {
    if (!task) return;
    onDelete?.(task.id);
    onClose();
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      section: !reminderOnly && recurring.includes('daily') ? 'daily' : section,
      reminder: reminder || undefined,
      recurring: !reminderOnly && recurring.length ? recurring : undefined,
      persistent: !reminderOnly && recurring.includes('daily')
        ? true
        : task?.persistent,
      reminderOnly: reminderOnly || undefined,
    });
    onClose();
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {task
                  ? (task.reminderOnly ? 'Edit reminder' : 'Edit task')
                  : (reminderOnly ? 'Add reminder' : 'Add task')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                <Pressable
                  style={[
                    styles.headerSaveBtn, 
                    !canSave && styles.headerSaveBtnDisabled,
                    hasChanges && { borderColor: APP_COLORS.delete }
                  ]}
                  onPress={handleSave}
                  disabled={!canSave}
                  hitSlop={8}
                >
                  <Text style={[
                    styles.headerSaveText,
                    hasChanges && { color: APP_COLORS.delete }
                  ]}>Save</Text>
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
                  <Text style={styles.closeText}>X</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Task type toggle: Goal vs Reminder */}
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeTab, !reminderOnly && styles.typeTabActive]}
                onPress={() => setReminderOnly(false)}
                accessibilityRole="button"
                accessibilityState={{ selected: !reminderOnly }}
              >
                <Text style={[styles.typeTabText, !reminderOnly && styles.typeTabTextActive]}>🎯  Task</Text>
              </Pressable>
              <Pressable
                style={[styles.typeTab, reminderOnly && styles.typeTabActiveReminder]}
                onPress={() => setReminderOnly(true)}
                accessibilityRole="button"
                accessibilityState={{ selected: reminderOnly }}
              >
                <Text style={[styles.typeTabText, reminderOnly && styles.typeTabTextActiveReminder]}>🔔  Reminder</Text>
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>What needs doing?</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={reminderOnly ? 'e.g. Call dentist' : 'e.g. Cut grass'}
                placeholderTextColor={APP_COLORS.textSubtle}
                value={name}
                onChangeText={setName}
                onSubmitEditing={handleSave}
                returnKeyType="done"
              />
            </View>

            {/* Reminder date — always visible, required when reminderOnly */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {reminderOnly ? (
                  <>
                    Date &amp; Time
                    {!reminder ? <Text style={styles.requiredHint}> — required</Text> : null}
                  </>
                ) : 'Reminder'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <DateTimePickerUI value={reminder} onChange={setReminder} />
                </View>
                {reminder ? (
                  <Pressable onPress={() => setReminder('')} style={{ padding: 8 }}>
                    <Text style={{ color: APP_COLORS.delete, fontSize: 30, fontWeight: '600' }}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Goal-only fields: Repeat + Section/Mode */}
            {!reminderOnly ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Repeat <Text style={styles.optional}>(optional — pick one)</Text>
                  </Text>
                  <View style={styles.chipRow}>
                    {REPEAT_OPTIONS.map((option) => {
                      const selected = recurring.includes(option.value);
                      return (
                        <View key={option.label} style={styles.repeatOption}>
                          <Pressable
                            onPress={() => toggleRepeat(option.value)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            style={[styles.chip, selected && styles.chipSelected]}
                          >
                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                              {option.label}
                            </Text>
                          </Pressable>
                          <Text style={[styles.repeatTotal, { color: SECTION_THEMES[option.value].accent }]}> 
                            {task ? formatDuration(minutesForSectionIncludingSubtasks(task, option.value)) : '0h00'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}
          </ScrollView>

          {task ? (
            <View style={styles.bottomBar}>
              <Pressable
                style={[
                  styles.bottomCompleteBtn,
                  completed && styles.bottomCompleteBtnActive,
                ]}
                onPress={handleToggleCompleted}
                accessibilityRole="button"
                accessibilityLabel="Complete task"
              >
                <Text style={[
                  styles.bottomCompleteText,
                  completed && styles.bottomCompleteTextActive,
                ]}>
                  {completed ? '✓ Completed' : 'Complete'}
                </Text>
              </Pressable>

              {onDelete ? (
                <Pressable
                  style={styles.bottomDeleteBtn}
                  onPress={handleDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete task"
                >
                  <Text style={styles.bottomDeleteText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  typeTab: {
    flex: 1,
    padding: 5,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
  },
  typeTabActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: SECTION_THEMES.daily.accentSoft,
  },
  typeTabActiveReminder: {
    borderColor: '#d97706',
    backgroundColor: '#fef3c7',
  },
  typeTabText: {
    fontSize: 30,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  typeTabTextActive: {
    color: APP_COLORS.primaryDark,
  },
  typeTabTextActiveReminder: {
    color: '#92400e',
  },

  keyboard: {
    flex: 1,
  },
  header: {
    backgroundColor: APP_COLORS.headerBg,
    padding: 10,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...softShadow(0.18, 16, 6),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flexShrink: 1,
  },
  headerCheckbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCheckboxDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  headerCheckmark: {
    color: APP_COLORS.headerBg,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: -2,
  },
  modalDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    fontSize: 30,
    lineHeight: 26,
    color: APP_COLORS.delete,
    fontWeight: '800',
    marginTop: -2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: APP_COLORS.headerText,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 30,
    fontWeight: '500',
    color: APP_COLORS.headerMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -4,
  },
  headerSaveBtn: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  headerSaveBtnDisabled: {
    // Keep fully white even when disabled
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.xl,
  },
  field: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 30,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  optional: {
    fontWeight: '400',
    color: APP_COLORS.textSubtle,
  },
  requiredHint: {
    fontWeight: '500',
    color: APP_COLORS.delete,
    fontSize: 30,
  },
  input: {
    fontSize: 30,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: APP_COLORS.text,
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.04, 6, 2),
  },
  inputWithCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: -2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  repeatOption: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  repeatTotal: {
    fontSize: 30,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    padding: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  chipSelected: {
    backgroundColor: SECTION_THEMES.today.accentSoft,
    borderColor: APP_COLORS.primary,
  },
  chipIcon: {
    fontSize: 30,
  },
  chipText: {
    fontSize: 30,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  chipTextSelected: {
    color: APP_COLORS.primaryDark,
  },
  alarmChipText: {
    fontSize: 30,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 5,
    alignItems: 'center',
    ...softShadow(0.2, 12, 4),
  },
  primaryBtnPressed: {
    backgroundColor: APP_COLORS.primaryDark,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.secondaryBtn,
    borderRadius: RADIUS.md,
    padding: 5,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: APP_COLORS.text,
    fontSize: 30,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  bottomCompleteBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.06, 8, 3),
  },
  bottomCompleteBtnActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  bottomCompleteText: {
    fontSize: 30,
    fontWeight: '700',
    color: APP_COLORS.primary,
  },
  bottomCompleteTextActive: {
    color: '#FFFFFF',
  },
  bottomDeleteBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 5,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: APP_COLORS.delete,
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.06, 8, 3),
  },
  bottomDeleteText: {
    fontSize: 30,
    fontWeight: '700',
    color: APP_COLORS.delete,
  },
});

