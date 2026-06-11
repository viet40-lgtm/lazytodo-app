import { StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../constants';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <View style={styles.header}>
        <Text style={styles.label}>Today&apos;s Progress</Text>
        <Text style={styles.count}>
          {completed} of {total} {total === 1 ? 'task' : 'tasks'} completed
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    gap: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  count: {
    fontSize: 17,
    color: '#444444',
  },
  track: {
    height: 10,
    backgroundColor: APP_COLORS.progressTrack,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: APP_COLORS.green,
    borderRadius: 999,
  },
});
