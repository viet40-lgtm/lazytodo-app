import { Pressable, StyleSheet, Text } from 'react-native';
import { APP_COLORS, FAB_SIZE, RADIUS, SCREEN_PADDING, softShadow } from '../constants';

interface FloatingButtonProps {
  onPress: () => void;
}

export function FloatingButton({ onPress }: FloatingButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add goal"
    >
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: SCREEN_PADDING,
    bottom: SCREEN_PADDING,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: RADIUS.lg,
    backgroundColor: APP_COLORS.fab,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow(0.28, 16, 6),
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    backgroundColor: APP_COLORS.primaryDark,
  },
  plus: {
    color: APP_COLORS.fabText,
    fontSize: 70,
    lineHeight: 70,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: -14,
  },
});
