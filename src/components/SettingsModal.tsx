import { useEffect, useRef, useState } from 'react';
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
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../constants';
import type { AppState } from '../types';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installGuide, setInstallGuide] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const showStatus = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  const handleInstallApp = async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      showStatus('App is already installed on your device!');
      return;
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone);

    if (isStandalone) {
      showStatus('✅ LazyToDo is already installed and running as an app!');
      setInstallGuide(null);
      return;
    }

    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showStatus('🎉 Installing LazyToDo on your device...');
          setInstallPrompt(null);
          setInstallGuide(null);
        }
      } catch {
        // fallback
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setInstallGuide('📱 On iOS (iPhone/iPad): Tap the Share button (⎋ / ⬆️) at the bottom of Safari, then tap "Add to Home Screen" (➕).');
      } else {
        setInstallGuide('📱 On Android: Tap the browser menu (⋮) in Chrome, then select "Install app" or "Add to Home screen".');
      }
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

          {status ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}

          {/* Install App Button */}
          <View style={styles.section}>
            <Pressable style={styles.installBtn} onPress={handleInstallApp}>
              <Text style={styles.installBtnText}>📲 Install App</Text>
            </Pressable>

            {installGuide ? (
              <View style={styles.guideBox}>
                <Text style={styles.guideText}>{installGuide}</Text>
              </View>
            ) : null}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Using Cloud Sync. Your tasks are securely saved to the cloud and available across all your devices.
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
    padding: 10,
    backgroundColor: APP_COLORS.headerBg,
  },
  title: {
    fontSize: 30,
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
    fontSize: 30,
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
    fontSize: 30,
    fontWeight: '800',
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  sectionDesc: {
    fontSize: 30,
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
    fontSize: 30,
    width: 36,
    textAlign: 'center',
    color: APP_COLORS.primary,
  },
  btnText: {
    flex: 1,
    gap: 2,
  },
  btnLabel: {
    fontSize: 30,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  btnSub: {
    fontSize: 30,
    color: APP_COLORS.textMuted,
  },
  statusBox: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 30,
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
    fontSize: 30,
    color: '#166534',
    lineHeight: 20,
  },
  installBtn: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installBtnText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
  },
  guideBox: {
    backgroundColor: '#fffbeb',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  guideText: {
    fontSize: 30,
    color: '#92400e',
    lineHeight: 22,
  },
});
