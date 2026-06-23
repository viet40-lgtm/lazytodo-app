import { useEffect } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../src/constants';

const FEATURES = [
  {
    icon: '☀️',
    title: 'Today',
    desc: 'One-off tasks for right now. Clear them and move on.',
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    icon: '🔄',
    title: 'Daily',
    desc: 'Habits and routines that reset every day automatically.',
    color: '#0891b2',
    bg: '#cffafe',
  },
  {
    icon: '📋',
    title: 'Weekly & Monthly',
    desc: 'Bigger goals that span the week or month.',
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  {
    icon: '⭐',
    title: 'Yearly',
    desc: 'Long-term goals. Always visible, never forgotten.',
    color: '#d97706',
    bg: '#fef3c7',
  },
];

const STEPS = [
  { num: '1', title: 'Add your tasks', desc: 'Drop in anything — a habit, a goal, a quick task.' },
  { num: '2', title: 'Check them off', desc: 'Satisfying taps. Recurring tasks reset themselves.' },
  { num: '3', title: 'Sync everywhere', desc: 'Sign in to sync across all your devices instantly.' },
];

export default function LandingPage() {
  const router = useRouter();

  // Native builds skip the landing page and go straight to the app.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/app');
    }
  }, [router]);

  // On native this renders nothing while the redirect fires.
  if (Platform.OS !== 'web') return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <Text style={styles.heroLogo}>LazyToDo.app</Text>
          <Text style={styles.heroHeadline}>
            The lazy way to{'\n'}stay on top of things.
          </Text>
          <Text style={styles.heroSub}>
            A minimalist daily planner for daily habits, weekly goals, and long-term dreams — all in one place. No overwhelm, no clutter.
          </Text>
          <View style={styles.heroCtas}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={() => router.push('/app')}
              accessibilityRole="button"
              accessibilityLabel="Get started for free"
            >
              <Text style={styles.primaryBtnText}>Get Started Free →</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
              onPress={() => router.push('/app')}
              accessibilityRole="button"
              accessibilityLabel="Sign in to your account"
            >
              <Text style={styles.ghostBtnText}>Sign In</Text>
            </Pressable>
          </View>
          <Text style={styles.heroNote}>No account required to get started.</Text>
        </View>

        {/* ── FEATURES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PLAN AT EVERY SCALE</Text>
          <Text style={styles.sectionTitle}>One app for every timeframe</Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={[styles.featureCard, { borderTopColor: f.color }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <Text style={[styles.featureTitle, { color: f.color }]}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={[styles.section, styles.howSection]}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>Simple by design</Text>
          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s.num} style={styles.step}>
                <View style={styles.stepNumWrap}>
                  <Text style={styles.stepNum}>{s.num}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── BOTTOM CTA ── */}
        <View style={styles.bottomCta}>
          <Text style={styles.bottomCtaTitle}>Ready to get lazy about it?</Text>
          <Text style={styles.bottomCtaSub}>
            Start in seconds. No sign-up required.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, styles.bottomCtaBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => router.push('/app')}
            accessibilityRole="button"
            accessibilityLabel="Open the app"
          >
            <Text style={styles.primaryBtnText}>Open the App →</Text>
          </Pressable>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>LazyToDo.app</Text>
          <Text style={styles.footerText}>
            Free forever. Available on Web, iOS & Android.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl * 2,
  },

  // ── Hero ──
  hero: {
    backgroundColor: APP_COLORS.headerBg,
    paddingHorizontal: SCREEN_PADDING * 1.5,
    paddingTop: SPACING.xxl * 1.5,
    paddingBottom: SPACING.xxl * 2,
    borderBottomLeftRadius: RADIUS.xl * 2,
    borderBottomRightRadius: RADIUS.xl * 2,
    alignItems: 'center',
    ...softShadow(0.2, 24, 10),
  },
  heroLogo: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.headerAccent,
    letterSpacing: 1,
    marginBottom: SPACING.lg,
    textTransform: 'uppercase',
  },
  heroHeadline: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 50,
    letterSpacing: -1,
    marginBottom: SPACING.lg,
  },
  heroSub: {
    fontSize: 18,
    fontWeight: '400',
    color: APP_COLORS.headerMuted,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 480,
    marginBottom: SPACING.xxl,
  },
  heroCtas: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    ...softShadow(0.3, 16, 6),
  },
  primaryBtnPressed: {
    backgroundColor: APP_COLORS.primaryDark,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ghostBtn: {
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(134, 239, 172, 0.5)',
  },
  ghostBtnPressed: {
    backgroundColor: 'rgba(134, 239, 172, 0.1)',
  },
  ghostBtnText: {
    color: APP_COLORS.headerAccent,
    fontSize: 17,
    fontWeight: '600',
  },
  heroNote: {
    fontSize: 13,
    color: 'rgba(187, 247, 208, 0.6)',
    fontWeight: '500',
  },

  // ── Section ──
  section: {
    paddingHorizontal: SCREEN_PADDING * 1.5,
    paddingVertical: SPACING.xxl * 1.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: APP_COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: APP_COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    letterSpacing: -0.5,
  },

  // ── Features ──
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    width: '47%',
    minWidth: 140,
    maxWidth: 240,
    borderTopWidth: 3,
    gap: SPACING.sm,
    ...softShadow(0.06, 12, 4),
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 14,
    color: APP_COLORS.textMuted,
    lineHeight: 20,
  },

  // ── How it works ──
  howSection: {
    backgroundColor: APP_COLORS.headerBg,
    marginHorizontal: SCREEN_PADDING,
    borderRadius: RADIUS.xl * 1.5,
    ...softShadow(0.15, 20, 8),
  },
  steps: {
    gap: SPACING.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.lg,
    position: 'relative',
  },
  stepNumWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(134, 239, 172, 0.15)',
    borderWidth: 2,
    borderColor: APP_COLORS.headerAccent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 18,
    fontWeight: '800',
    color: APP_COLORS.headerAccent,
  },
  stepLine: {
    position: 'absolute',
    left: 21,
    top: 44,
    width: 2,
    height: SPACING.lg + 44,
    backgroundColor: 'rgba(134, 239, 172, 0.2)',
  },
  stepBody: {
    flex: 1,
    paddingTop: SPACING.xs,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 15,
    color: APP_COLORS.headerMuted,
    lineHeight: 22,
  },

  // ── Bottom CTA ──
  bottomCta: {
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING * 1.5,
    paddingVertical: SPACING.xxl * 1.5,
    gap: SPACING.md,
  },
  bottomCtaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: APP_COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  bottomCtaSub: {
    fontSize: 16,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  bottomCtaBtn: {
    paddingHorizontal: SPACING.xxl * 1.5,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
    paddingTop: SPACING.lg,
    gap: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    marginHorizontal: SCREEN_PADDING,
  },
  footerLogo: {
    fontSize: 16,
    fontWeight: '800',
    color: APP_COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 13,
    color: APP_COLORS.textSubtle,
  },
});
