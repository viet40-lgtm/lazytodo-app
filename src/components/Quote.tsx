import { StyleSheet, Text, View } from 'react-native';
import { APP_COLORS, RADIUS, SPACING, softShadow } from '../constants';

interface QuoteProps {
  text: string;
}

export function Quote({ text }: QuoteProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.mark}>“</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    ...softShadow(0.06, 10, 3),
  },
  mark: {
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '800',
    color: APP_COLORS.accentSoft,
    marginBottom: -8,
  },
  text: {
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 28,
    color: APP_COLORS.quote,
    letterSpacing: -0.3,
  },
});
