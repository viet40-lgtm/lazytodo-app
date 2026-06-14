import { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING } from '../constants';
import type { AppState } from '../types';
import { loadState, saveState } from '../services/storage';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: (state: AppState) => void;
}

export function SettingsModal({ visible, onClose, onRestore }: SettingsModalProps) {
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showStatus = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  // ── Backup ──────────────────────────────────────────────────────────────
  const handleBackup = async () => {
    try {
      const state = await loadState();
      const json = JSON.stringify(state, null, 2);
      const filename = `lazytodo-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showStatus('✅ Backup downloaded!');
      } else {
        // Native: share via share sheet
        const { Share } = await import('react-native');
        await Share.share({ title: filename, message: json });
        showStatus('✅ Backup shared!');
      }
    } catch (e) {
      showStatus('❌ Backup failed. Try again.');
    }
  };

  // ── Restore ─────────────────────────────────────────────────────────────
  const handleRestoreWeb = () => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (!parsed || !Array.isArray(parsed.tasks)) {
            showStatus('❌ Invalid backup file.');
            return;
          }
          await saveState(parsed);
          onRestore(parsed);
          showStatus(`✅ Restored ${parsed.tasks.length} tasks!`);
        } catch {
          showStatus('❌ Could not read file. Make sure it is a valid backup.');
        }
      };
      input.click();
    }
  };

  const handleRestore = () => {
    if (Platform.OS === 'web') {
      handleRestoreWeb();
    } else {
      showStatus('On mobile, tap Backup first, then re-import the shared file.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️  Settings</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Backup / Restore section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Backup & Restore</Text>
            <Text style={styles.sectionDesc}>
              Save all your tasks to a local JSON file so you can restore them any time —
              even if cloud sync fails.
            </Text>

            <Pressable style={[styles.btn, styles.backupBtn]} onPress={handleBackup}>
              <Text style={styles.btnIcon}>⬇</Text>
              <View style={styles.btnText}>
                <Text style={styles.btnLabel}>Backup Data</Text>
                <Text style={styles.btnSub}>Download a .json file to your device</Text>
              </View>
            </Pressable>

            <Pressable style={[styles.btn, styles.restoreBtn]} onPress={handleRestore}>
              <Text style={styles.btnIcon}>⬆</Text>
              <View style={styles.btnText}>
                <Text style={[styles.btnLabel, { color: '#fff' }]}>Restore from Backup</Text>
                <Text style={[styles.btnSub, { color: 'rgba(255,255,255,0.75)' }]}>
                  Pick a .json backup file to load
                </Text>
              </View>
            </Pressable>

            {status ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            ) : null}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Tip: Back up regularly, especially before major changes. The backup file
              contains all your tasks, sections, reminders, and time logs.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: APP_COLORS.headerBg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  content: {
    padding: SCREEN_PADDING,
    gap: SPACING.xl,
    paddingBottom: 48,
  },
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  sectionDesc: {
    fontSize: 16,
    color: APP_COLORS.textMuted,
    lineHeight: 22,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
  },
  backupBtn: {
    backgroundColor: APP_COLORS.surface,
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
  },
  restoreBtn: {
    backgroundColor: APP_COLORS.primary,
  },
  btnIcon: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
    color: APP_COLORS.primary,
  },
  btnText: {
    flex: 1,
    gap: 2,
  },
  btnLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  btnSub: {
    fontSize: 13,
    color: APP_COLORS.textMuted,
  },
  statusBox: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
});
