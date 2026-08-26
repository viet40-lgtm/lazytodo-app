import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../constants';
import { FloatingButton } from './FloatingButton';

interface AppHeaderProps {
  onAccountPress?: () => void;
  onUpdatePress?: () => void;
  onAddPress?: () => void;
  loggedIn?: boolean;
  syncing?: boolean;
  showAccount?: boolean;
}

export function AppHeader({ onAccountPress, onUpdatePress, onAddPress, loggedIn = false, syncing = false, showAccount = true }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.leftCol}>
          <Text style={styles.urlText}>LazyToDo.app</Text>
          <View style={styles.dateRow}>
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
            {showAccount && onUpdatePress ? (
              <Pressable style={styles.updateBtn} onPress={onUpdatePress} accessibilityRole="button">
                <Text style={styles.updateText}>Update</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.rightCol}>
          {onAddPress ? (
            <FloatingButton onPress={onAddPress} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: APP_COLORS.headerBg,
    position: 'relative',
    padding: 10,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...softShadow(0.18, 16, 6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  urlText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: APP_COLORS.headerText,
    letterSpacing: -0.6,
  },
  rightCol: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.headerAccent,
  },
  updateBtn: {
    backgroundColor: 'rgba(134, 239, 172, 0.15)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    fontSize: 25,
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
