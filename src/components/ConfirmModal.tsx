import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../constants';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: APP_COLORS.modalOverlay,
    justifyContent: 'center',
    padding: SCREEN_PADDING,
  },
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    gap: SPACING.lg,
    ...softShadow(0.15, 16, 6),
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.text,
  },
  message: {
    fontSize: 20,
    lineHeight: 28,
    color: APP_COLORS.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.secondaryBtn,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: APP_COLORS.delete,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
});
