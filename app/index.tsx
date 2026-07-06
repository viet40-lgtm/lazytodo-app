import { useEffect, useState } from 'react';
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
import { useAuth } from '../src/hooks/useAuth';

const FEATURES = [
  {
    icon: '☀️',
    title: 'Today\'s Tasks',
    desc: 'Quick one-off tasks for right now. Add, check off, move on — clutter-free.',
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    icon: '🔄',
    title: 'Daily Habit Tracker',
    desc: 'Track daily habits and routines. They reset automatically every morning.',
    color: '#0891b2',
    bg: '#cffafe',
  },
  {
    icon: '📋',
    title: 'Weekly & Monthly Goals',
    desc: 'Bigger tasks that span the week or month. Stay on track without micromanaging.',
    color: '#0284c7',
    bg: '#e0f2fe',
  },
  {
    icon: '⭐',
    title: 'Yearly Goals',
    desc: 'Long-term dreams and ambitions. Always visible, never forgotten.',
    color: '#d97706',
    bg: '#fef3c7',
  },
  {
    icon: '🔔',
    title: 'Reminders',
    desc: 'Set time-based reminders for any task. Never miss what matters.',
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    icon: '☁️',
    title: 'Cross-Device Sync',
    desc: 'Sign in free to sync your tasks across iPhone, Android, and web instantly.',
    color: '#0d9488',
    bg: '#ccfbf1',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Add your tasks — no sign-up needed',
    desc: 'Open the app and start adding tasks immediately. No account, no credit card, no friction.',
  },
  {
    num: '2',
    title: 'Check them off',
    desc: 'Tap to complete. Recurring tasks and daily habits reset themselves automatically.',
  },
  {
    num: '3',
    title: 'Sync across all your devices',
    desc: 'Create a free account to sync your tasks across iPhone, Android, and web in real time.',
  },
];

const FAQS = [
  {
    q: 'Is Lazy To-Do free?',
    a: 'Yes — completely free, forever. No subscription, no credit card, no hidden fees. Core features will always be free.',
  },
  {
    q: 'Do I need an account to use it?',
    a: 'No. You can start using the app immediately with no sign-up required. Your tasks are saved locally on your device. Create a free account only if you want to sync across devices.',
  },
  {
    q: 'Can I track daily habits?',
    a: 'Yes. The Daily section is designed as a habit tracker — tasks added there reset automatically every day so you can build consistent routines.',
  },
  {
    q: 'Does it support recurring tasks?',
    a: 'Yes. You can set tasks to repeat daily, weekly, biweekly, monthly, or yearly. Recurring tasks spawn the next occurrence automatically when completed or skipped.',
  },
  {
    q: 'Can I set reminders?',
    a: 'Yes. You can attach a time-based reminder to any task. Reminders work on web, iOS, and Android.',
  },
  {
    q: 'Does it sync across iPhone and Android?',
    a: 'Yes. Sign in with a free account and your tasks sync across all devices — web, iPhone, and Android — in real time.',
  },
  {
    q: 'Is there a mobile app?',
    a: 'Yes. Lazy To-Do is available as a native app on iOS (iPhone) and Android, as well as in any web browser at lazytodo.app.',
  },
  {
    q: 'How is this different from other to-do apps?',
    a: 'Most task managers are overwhelming. Lazy To-Do is intentionally simple — it organizes tasks by timeframe (today, daily, weekly, monthly, yearly) so you always know what to focus on, without complex projects or folders.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const auth = useAuth();

  // Native builds skip the landing page and go straight to the app.
  // On web, if the user is already authenticated, also skip the landing page.
  useEffect(() => {
    if (Platform.OS !== 'web' || (auth.configured && auth.userId)) {
      router.replace('/app');
    }
  }, [router, auth.configured, auth.userId]);

  // On native this renders nothing while the redirect fires.
  // On web, also render nothing if loading auth state or redirecting.
  if (Platform.OS !== 'web' || auth.loading || (auth.configured && auth.userId)) return null;

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
          <Text
            style={styles.heroHeadline}
            accessibilityRole="heading"
            aria-level={1}
          >
            The lazy way to{'\n'}stay on top of things.
          </Text>
          <Text style={styles.heroSub}>
            A free, minimalist task manager and daily habit tracker. Organize your daily tasks, weekly goals, and long-term plans — all in one place. No account needed to get started.
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
              onPress={() => router.push('/app?auth=1')}
              accessibilityRole="button"
              accessibilityLabel="Sign in to your account"
            >
              <Text style={styles.ghostBtnText}>Sign In</Text>
            </Pressable>
          </View>
          <Text style={styles.heroNote}>✓ Free forever &nbsp;·&nbsp; ✓ No sign-up required &nbsp;·&nbsp; ✓ Works offline</Text>
        </View>

        {/* ── FEATURES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FEATURES</Text>
          <Text style={styles.sectionTitle}>Everything you need, nothing you don't</Text>
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

        {/* ── FAQ ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FAQ</Text>
          <Text style={styles.sectionTitle}>Frequently asked questions</Text>
          <View style={styles.faqList}>
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <Pressable
                  key={i}
                  style={[styles.faqItem, isOpen && styles.faqItemOpen]}
                  onPress={() => setOpenFaq(isOpen ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={item.q}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQ}>{item.q}</Text>
                    <Text style={[styles.faqChevron, isOpen && styles.faqChevronOpen]}>›</Text>
                  </View>
                  {isOpen && (
                    <Text style={styles.faqA}>{item.a}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── BOTTOM CTA ── */}
        <View style={styles.bottomCta}>
          <Text style={styles.bottomCtaTitle}>Ready to get lazy about it?</Text>
          <Text style={styles.bottomCtaSub}>
            Free task manager. No account required. Works on web, iPhone & Android.
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
            Free forever. Available on Web, iOS & Android. No account required.
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
    fontSize: 17,
    fontWeight: '400',
    color: APP_COLORS.headerMuted,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 500,
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
    color: 'rgba(187, 247, 208, 0.7)',
    fontWeight: '500',
    textAlign: 'center',
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
    fontSize: 28,
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
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 13,
    color: APP_COLORS.textMuted,
    lineHeight: 19,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: APP_COLORS.headerMuted,
    lineHeight: 21,
  },

  // ── FAQ ──
  faqList: {
    gap: SPACING.sm,
  },
  faqItem: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    ...softShadow(0.04, 6, 2),
  },
  faqItemOpen: {
    borderColor: APP_COLORS.green,
    ...softShadow(0.08, 10, 4),
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  faqQ: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.text,
    flex: 1,
    lineHeight: 22,
  },
  faqChevron: {
    fontSize: 22,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
    transform: [{ rotate: '90deg' }],
  },
  faqChevronOpen: {
    transform: [{ rotate: '-90deg' }],
    color: APP_COLORS.primary,
  },
  faqA: {
    fontSize: 14,
    color: APP_COLORS.textMuted,
    lineHeight: 22,
    marginTop: SPACING.sm,
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
    fontSize: 15,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 22,
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
    textAlign: 'center',
  },
});
