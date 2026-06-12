import { Pressable, StyleSheet, View } from 'react-native';
import { APP_COLORS, FAB_SIZE, RADIUS, SCREEN_PADDING, softShadow } from '../constants';

import type { StyleProp, ViewStyle } from 'react-native';

interface FloatingButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function FloatingButton({ onPress, style }: FloatingButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, style, pressed && styles.fabPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add goal"
    >
      <View style={styles.iconH} />
      <View style={styles.iconV} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
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
  iconH: {
    position: 'absolute',
    width: 36,
    height: 4,
    backgroundColor: APP_COLORS.fabText,
    borderRadius: 2,
  },
  iconV: {
    position: 'absolute',
    width: 4,
    height: 36,
    backgroundColor: APP_COLORS.fabText,
    borderRadius: 2,
  },
});
