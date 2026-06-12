import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { APP_COLORS, RADIUS, SECTION_THEMES, SPACING, softShadow } from '../constants';

interface CompletionCelebrationProps {
  show: boolean;
}

export function CompletionCelebration({ show }: CompletionCelebrationProps) {
  const { width } = useWindowDimensions();
  const [fireConfetti, setFireConfetti] = useState(false);
  const useNativeConfetti = Platform.OS !== 'web';

  useEffect(() => {
    if (show) {
      setFireConfetti(true);
      return;
    }
    setFireConfetti(false);
  }, [show]);

  if (!show) return null;

  return (
    <View style={styles.container}>
      {useNativeConfetti && fireConfetti ? (
        <ConfettiCannon
          count={80}
          origin={{ x: width / 2, y: 0 }}
          fadeOut
          colors={[
            SECTION_THEMES.today.accent,
            SECTION_THEMES.weekly.accent,
            SECTION_THEMES.monthly.accent,
            SECTION_THEMES.yearly.accent,
          ]}
        />
      ) : null}
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.message}>You did enough today.</Text>
      <Text style={styles.subtext}>Every goal is checked off. Go relax.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: SECTION_THEMES.today.accentSoft,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    ...softShadow(0.08, 12, 4),
  },
  emoji: {
    fontSize: 25,
  },
  message: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtext: {
    fontSize: 25,
    fontWeight: '500',
    color: APP_COLORS.textMuted,
    textAlign: 'center',
  },
});
