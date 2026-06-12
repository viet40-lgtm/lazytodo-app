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
import { DateTimePickerUI } from './DateTimePickerUI';

interface TaskModalProps {
  visible: boolean;
  task?: Task | null;
  defaultSection?: TaskSection;
  onSave: (data: {
    name: string;
    section: TaskSection;
    reminder?: string;
    recurring?: Recurring;
  }) => void;
  onClose: () => void;
}

const SECTION_OPTIONS: TaskSection[] = ['today', 'weekly', 'monthly', 'yearly'];

const REPEAT_OPTIONS: { value: Recurring | ''; label: string }[] = [
  { value: '', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Week' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
];

export function TaskModal({ visible, task, defaultSection = 'today', onSave, onClose }: TaskModalProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [section, setSection] = useState<TaskSection>(task?.section ?? defaultSection);
  const [reminder, setReminder] = useState(task?.reminder ?? '');
  const [recurring, setRecurring] = useState<Recurring | ''>(task?.recurring ?? '');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setName(task?.name ?? '');
    setSection(task?.section ?? defaultSection);
    setReminder(task?.reminder ?? '');
    setRecurring(task?.recurring ?? '');
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [visible, task, defaultSection]);

  // Auto-categorize section based on reminder date
  useEffect(() => {
    if (!reminder) return;
    const pickedDate = new Date(reminder);
    if (isNaN(pickedDate.getTime())) return;
    
    const now = new Date();
    const pickedDay = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate()).getTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const diffDays = (pickedDay - today) / (24 * 60 * 60 * 1000);
    
    if (diffDays === 0) {
      setSection('today');
    } else if (diffDays > 0 && diffDays <= 7) {
      setSection('weekly');
    } else if (diffDays > 7 && diffDays <= 30) {
      setSection('monthly');
    } else if (diffDays > 30) {
      setSection('yearly');
    }
  }, [reminder]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      section,
      reminder: reminder || undefined,
      recurring: recurring || undefined,
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
              <Text style={styles.title}>{task ? 'Edit goal' : 'Add goal'}</Text>
              <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Keep it small and doable.</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <Text style={styles.label}>What needs doing?</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="e.g. Cut grass"
                placeholderTextColor={APP_COLORS.textSubtle}
                value={name}
                onChangeText={setName}
                returnKeyType="done"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Section</Text>
              <View style={styles.chipRow}>
                {SECTION_OPTIONS.map((option) => {
                  const theme = SECTION_THEMES[option];
                  const selected = section === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setSection(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.chip,
                        selected && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                      ]}
                    >
                      <Text style={styles.chipIcon}>{theme.icon}</Text>
                      <Text style={[styles.chipText, selected && { color: theme.accent }]}>
                        {SECTION_LABELS[option]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Reminder <Text style={styles.optional}>(optional)</Text>
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

            <View style={styles.field}>
              <Text style={styles.label}>
                Repeat <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={styles.chipRow}>
                {REPEAT_OPTIONS.map((option) => {
                  const selected = recurring === option.value;
                  return (
                    <Pressable
                      key={option.label}
                      onPress={() => setRecurring(option.value)}
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
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                !name.trim() && styles.primaryBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={styles.primaryBtnText}>{task ? 'Save goal' : 'Add goal'}</Text>
            </Pressable>
          </View>
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
    color: APP_COLORS.fabText,
    fontSize: 25,
    fontWeight: '700',
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
});
