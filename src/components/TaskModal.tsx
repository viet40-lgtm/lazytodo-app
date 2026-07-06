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
}

const SECTION_OPTIONS: TaskSection[] = ['today', 'weekly', 'monthly', 'yearly'];

const REPEAT_OPTIONS: { value: Recurring; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Week' },
  { value: 'biweekly', label: 'Bi-Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

export function TaskModal({ visible, task, defaultSection = 'today', onSave, onClose }: TaskModalProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [section, setSection] = useState<TaskSection>(task?.section ?? defaultSection);
  const [reminder, setReminder] = useState(task?.reminder ?? '');
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [persistent, setPersistent] = useState(task?.persistent ?? false);
  const [reminderOnly, setReminderOnly] = useState(task?.reminderOnly ?? false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setName(task?.name ?? '');
    setSection(task?.section ?? defaultSection);
    setReminder(task?.reminder ?? '');
    const rec = normalizeRecurring(task?.recurring);
    setRecurring(rec);
    // Default persistent to true when a recurring task is being created/edited.
    setPersistent(task?.persistent ?? false);
    setReminderOnly(task?.reminderOnly ?? false);
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

    const now = new Date();
    const pickedDay = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = (pickedDay - today) / (24 * 60 * 60 * 1000);

    if (diffDays <= 0) {
      setSection('today');
    } else if (diffDays <= 7) {
      setSection('weekly');
    } else if (diffDays <= 30) {
      setSection('monthly');
    } else {
      setSection('yearly');
    }
  }, [reminder]);

  const requiresReminder = false;
  const canSave = Boolean(name.trim()) && (!reminderOnly || Boolean(reminder));
  
  const hasChanges = (
    name !== (task?.name ?? '') ||
    section !== (task?.section ?? defaultSection) ||
    reminder !== (task?.reminder ?? '') ||
    JSON.stringify(recurring) !== JSON.stringify(normalizeRecurring(task?.recurring)) ||
    persistent !== (task?.persistent ?? false) ||
    reminderOnly !== (task?.reminderOnly ?? false)
  );

  const toggleRepeat = (value: Recurring) => {
    const next = recurring.includes(value)
      ? recurring.filter((r) => r !== value)
      : [...recurring, value];
    setRecurring(next);
    // Keep persistent in sync — enable on first pick, disable when none left.
    if (next.length > 0 && !persistent) setPersistent(true);
    if (next.length === 0) setPersistent(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      section: !reminderOnly && recurring.includes('daily') ? 'daily' : section,
      reminder: reminder || undefined,
      recurring: !reminderOnly && recurring.length ? recurring : undefined,
      persistent: !reminderOnly && recurring.length > 0 && persistent ? true : undefined,
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
            {reminderOnly ? (
              <Text style={styles.subtitle}>
                Set a date & time to be notified.
              </Text>
            ) : null}
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
                    <Text style={{ color: APP_COLORS.delete, fontSize: 16, fontWeight: '600' }}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Goal-only fields: Repeat + Section/Mode */}
            {!reminderOnly ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Repeat <Text style={styles.optional}>(optional — pick any)</Text>
                  </Text>
                  <View style={styles.chipRow}>
                    {REPEAT_OPTIONS.map((option) => {
                      const selected = recurring.includes(option.value);
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => toggleRepeat(option.value)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={[styles.chip, selected && styles.chipSelected]}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {recurring.length > 0 ? (
                  // When repeat is selected, show the Persistent Habit toggle.
                  <View style={styles.field}>
                    <Text style={styles.label}>Mode</Text>
                    <Pressable
                      style={[styles.persistentRow, persistent && styles.persistentRowOn]}
                      onPress={() => setPersistent((v) => !v)}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: persistent }}
                    >
                      <View style={[styles.persistentDot, persistent && styles.persistentDotOn]} />
                      <View style={styles.persistentText}>
                        <Text style={[styles.persistentTitle, persistent && styles.persistentTitleOn]}>
                          {persistent ? '🔁  Persistent habit' : '🔗  One-time chain'}
                        </Text>
                        <Text style={styles.persistentDesc}>
                          {persistent
                            ? 'One task, always there. Tracks time across all periods.'
                            : 'Spawns a new copy each period when completed.'}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>
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
    paddingVertical: SPACING.md,
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
    fontSize: 20,
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
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
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.headerText,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: APP_COLORS.headerMuted,
    marginTop: 2,
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
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -4,
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
    fontSize: 20,
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
    fontSize: 14,
  },
  input: {
    fontSize: 25,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: APP_COLORS.text,
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.04, 6, 2),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
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
    fontSize: 25,
  },
  chipText: {
    fontSize: 25,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  chipTextSelected: {
    color: APP_COLORS.primaryDark,
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
    paddingVertical: SPACING.lg,
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
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.secondaryBtn,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: APP_COLORS.text,
    fontSize: 25,
    fontWeight: '600',
  },
  persistentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  persistentRowOn: {
    borderColor: APP_COLORS.primary,
    backgroundColor: SECTION_THEMES.daily.accentSoft,
  },
  persistentDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: APP_COLORS.textSubtle,
    backgroundColor: APP_COLORS.surface,
  },
  persistentDotOn: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primary,
  },
  persistentText: {
    flex: 1,
    gap: 2,
  },
  persistentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
  persistentTitleOn: {
    color: APP_COLORS.primaryDark,
  },
  persistentDesc: {
    fontSize: 16,
    fontWeight: '400',
    color: APP_COLORS.textSubtle,
    lineHeight: 20,
  },
});

