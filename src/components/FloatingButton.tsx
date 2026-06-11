import { Pressable, StyleSheet, Text } from 'react-native';
import { APP_COLORS } from '../constants';

interface FloatingButtonProps {
  onPress: () => void;
}

export function FloatingButton({ onPress }: FloatingButtonProps) {
  return (
    <Pressable style={styles.fab} onPress={onPress} accessibilityRole="button" accessibilityLabel="Add task">
      <Text style={styles.plus}>+</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: APP_COLORS.fab,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  plus: {
    color: APP_COLORS.fabText,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
    marginTop: -2,
  },
});
