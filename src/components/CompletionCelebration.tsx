import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { APP_COLORS } from '../constants';

interface CompletionCelebrationProps {
  show: boolean;
}

export function CompletionCelebration({ show }: CompletionCelebrationProps) {
  const { width } = useWindowDimensions();
  const [fireConfetti, setFireConfetti] = useState(false);

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
      {fireConfetti ? (
        <ConfettiCannon
          count={80}
          origin={{ x: width / 2, y: 0 }}
          fadeOut
          colors={[APP_COLORS.green, APP_COLORS.text, '#e5e5e5']}
        />
      ) : null}
      <Text style={styles.message}>You did enough today.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  message: {
    fontSize: 24,
    fontWeight: '600',
    color: APP_COLORS.green,
    textAlign: 'center',
  },
});
