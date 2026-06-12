import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../constants';
import { FloatingButton } from './FloatingButton';

interface AppHeaderProps {
  onAccountPress?: () => void;
  onAddPress?: () => void;
  loggedIn?: boolean;
  syncing?: boolean;
  showAccount?: boolean;
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function AppHeader({ onAccountPress, onAddPress, loggedIn = false, syncing = false, showAccount = true }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{todayLabel()}</Text>
          <Text style={styles.title}>Lazy To-Do</Text>
        </View>
        <View style={styles.rightCol}>
          {showAccount ? (
            <Pressable
              style={styles.accountBtn}
              onPress={onAccountPress}
              accessibilityRole="button"
              accessibilityLabel={loggedIn ? 'Account' : 'Sign in'}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={APP_COLORS.headerAccent} />
              ) : (
                <Text style={styles.accountText}>{loggedIn ? '☁ Synced' : '☁ Sign in'}</Text>
              )}
            </Pressable>
          ) : null}
          {onAddPress ? (
            <View>
              <FloatingButton onPress={onAddPress} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: APP_COLORS.headerBg,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...softShadow(0.18, 16, 6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.headerMuted,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: APP_COLORS.headerText,
    letterSpacing: -0.6,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  accountBtn: {
    backgroundColor: 'rgba(134, 239, 172, 0.15)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    minHeight: 32,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.headerAccent,
  },
  dateChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    maxWidth: 180,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '600',
    color: APP_COLORS.headerAccent,
    textAlign: 'right',
  },
});
