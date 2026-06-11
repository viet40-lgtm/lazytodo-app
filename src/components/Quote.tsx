import { StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../constants';

interface QuoteProps {
  text: string;
}

export function Quote({ text }: QuoteProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  text: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 38,
    color: APP_COLORS.text,
    letterSpacing: -0.4,
  },
});
