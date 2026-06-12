import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../constants';
import type { AuthResult } from '../hooks/useAuth';

interface AuthModalProps {
  visible: boolean;
  configured: boolean;
  email: string | null;
  onSignIn: (email: string, password: string) => Promise<AuthResult>;
  onSignUp: (email: string, password: string) => Promise<AuthResult>;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

export function AuthModal({
  visible,
  configured,
  email,
  onSignIn,
  onSignUp,
  onSignOut,
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [emailValue, setEmailValue] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loggedIn = Boolean(email);

  useEffect(() => {
    if (!visible) return;
    setEmailValue('');
    setPassword('');
    setError(null);
    setInfo(null);
    setBusy(false);
    setMode('signin');
  }, [visible]);

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!emailValue.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const result =
      mode === 'signin'
        ? await onSignIn(emailValue, password)
        : await onSignUp(emailValue, password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    if (result.needsConfirmation) {
      setInfo('Check your email to confirm your account, then sign in.');
      setMode('signin');
      setPassword('');
      return;
    }
    onClose();
  };

  const handleSignOut = async () => {
    setBusy(true);
    await onSignOut();
    setBusy(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{loggedIn ? 'Account' : 'Sync your goals'}</Text>
              <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
                <Text style={styles.closeText}>X</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              {loggedIn ? 'Your goals sync across devices.' : 'Sign in to use your goals on any device.'}
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!configured ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Cloud sync isn’t set up yet. Add your Supabase keys to a .env file
                  (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY) and restart.
                </Text>
              </View>
            ) : loggedIn ? (
              <View style={styles.field}>
                <Text style={styles.label}>Signed in as</Text>
                <Text style={styles.email}>{email}</Text>
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  onPress={handleSignOut}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={APP_COLORS.fabText} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign out</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.segment}>
                  <Pressable
                    style={[styles.segmentBtn, mode === 'signin' && styles.segmentBtnActive]}
                    onPress={() => setMode('signin')}
                  >
                    <Text style={[styles.segmentText, mode === 'signin' && styles.segmentTextActive]}>
                      Sign in
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentBtn, mode === 'signup' && styles.segmentBtnActive]}
                    onPress={() => setMode('signup')}
                  >
                    <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
                      Create account
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={APP_COLORS.textSubtle}
                    value={emailValue}
                    onChangeText={setEmailValue}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={APP_COLORS.textSubtle}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                {info ? <Text style={styles.info}>{info}</Text> : null}

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
                  onPress={handleSubmit}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color={APP_COLORS.fabText} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {mode === 'signin' ? 'Sign in' : 'Create account'}
                    </Text>
                  )}
                </Pressable>
              </>
            )}
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
    fontSize: 18,
    fontWeight: '500',
    color: APP_COLORS.headerMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: APP_COLORS.headerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: APP_COLORS.headerMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.backgroundAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    gap: SPACING.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.06, 6, 2),
  },
  segmentText: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  segmentTextActive: {
    color: APP_COLORS.primaryDark,
  },
  field: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  email: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.primaryDark,
  },
  input: {
    fontSize: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: APP_COLORS.text,
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.04, 6, 2),
  },
  error: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.delete,
  },
  info: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.primaryDark,
  },
  notice: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...softShadow(0.04, 6, 2),
  },
  noticeText: {
    fontSize: 18,
    lineHeight: 26,
    color: APP_COLORS.textMuted,
  },
  primaryBtn: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...softShadow(0.2, 12, 4),
  },
  primaryBtnPressed: {
    backgroundColor: APP_COLORS.primaryDark,
  },
  primaryBtnText: {
    color: APP_COLORS.fabText,
    fontSize: 20,
    fontWeight: '700',
  },
});
