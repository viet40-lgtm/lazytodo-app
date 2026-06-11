import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { APP_COLORS } from '../constants';
import type { Recurring, Task } from '../types';

interface TaskModalProps {
  visible: boolean;
  task?: Task | null;
  onSave: (data: { name: string; reminder?: string; recurring?: Recurring }) => void;
  onClose: () => void;
}

export function TaskModal({ visible, task, onSave, onClose }: TaskModalProps) {
  const [name, setName] = useState(task?.name ?? '');
  const [reminder, setReminder] = useState(task?.reminder ?? '');
  const [recurring, setRecurring] = useState<Recurring | ''>(task?.recurring ?? '');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setName(task?.name ?? '');
    setReminder(task?.reminder ?? '');
    setRecurring(task?.recurring ?? '');
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [visible, task]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      reminder: reminder || undefined,
      recurring: recurring || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{task ? 'Edit task' : 'Add task'}</Text>

            <Text style={styles.label}>What needs doing?</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="e.g. Drink water"
              placeholderTextColor={APP_COLORS.textSubtle}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Text style={styles.label}>
              Reminder <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (24h)"
              placeholderTextColor={APP_COLORS.textSubtle}
              value={reminder}
              onChangeText={setReminder}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.label}>
              Repeat <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={recurring}
                onValueChange={(value) => setRecurring(value as Recurring | '')}
                style={styles.picker}
              >
                <Picker.Item label="No repeat" value="" />
                <Picker.Item label="Daily" value="daily" />
                <Picker.Item label="Weekly" value="weekly" />
                <Picker.Item label="Monthly" value="monthly" />
              </Picker>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, !name.trim() && styles.primaryBtnDisabled]}
                onPress={handleSave}
                disabled={!name.trim()}
              >
                <Text style={styles.primaryBtnText}>{task ? 'Save' : 'Add'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: APP_COLORS.modalOverlay,
    justifyContent: 'flex-end',
  },
  keyboard: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: APP_COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  optional: {
    fontWeight: '400',
    color: APP_COLORS.textSubtle,
  },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: APP_COLORS.text,
    backgroundColor: APP_COLORS.inputBg,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.fab,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: APP_COLORS.fabText,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.secondaryBtn,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: APP_COLORS.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
