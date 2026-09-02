import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_COLORS, RADIUS, SPACING, softShadow } from '../constants';
import { setSystemAlarm } from '../services/pomodoroNotifications';

const DEFAULT_MINUTES = 5;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatTotalTime(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  return `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, '0')}`;
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

let globalAudioCtx: any = null;

function beep() {
  if (Platform.OS !== 'web') return;
  try {
    // @ts-ignore web audio is unavailable in native builds
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
    const oscillator = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(globalAudioCtx.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.start();
    oscillator.stop(globalAudioCtx.currentTime + 0.5);
  } catch {
    // Audio is best effort on web.
  }
}

async function beepCycle(count: number) {
  for (let index = 0; index < count; index += 1) {
    beep();
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
}

export function PomodoroTimer() {
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const [seconds, setSeconds] = useState(DEFAULT_MINUTES * 60);
  const [grandTotalSeconds, setGrandTotalSeconds] = useState(0);
  const [cycleStartTime, setCycleStartTime] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = setTimeout(() => {
      setSeconds((value) => value - 1);
      setGrandTotalSeconds((value) => value + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [running, seconds]);

  useEffect(() => {
    if (running && seconds === 0) {
      const cycleMinutes = Math.max(1, Number(minutes) || DEFAULT_MINUTES);
      const cycleSeconds = cycleMinutes * 60;
      const nextCycleStartTime = Date.now();
      setSeconds(cycleSeconds);
      setCycleStartTime(nextCycleStartTime);
      void beepCycle(cycleMinutes);
      void AsyncStorage.setItem(
        '@lazy_todo_countdown_state',
        JSON.stringify({ running: true, startTime: nextCycleStartTime, seconds: cycleSeconds, grandTotalSeconds }),
      );
    }
  }, [grandTotalSeconds, minutes, running, seconds]);

  useEffect(() => {
    const restore = async () => {
      const value = await AsyncStorage.getItem('@lazy_todo_countdown_state');
      if (!value) return;
      const saved = JSON.parse(value);
      const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);
      const duration = saved.seconds;
      const cycleElapsed = elapsed % duration;
      const remaining = cycleElapsed === 0 ? duration : duration - cycleElapsed;
      const savedGrandTotal = saved.grandTotalSeconds || 0;
      setSeconds(remaining);
      setGrandTotalSeconds(savedGrandTotal + elapsed);
      setCycleStartTime(saved.startTime);
      setMinutes(String(Math.max(1, Math.floor(duration / 60))));
      setRunning(Boolean(saved.running));
    };
    restore();
  }, []);

  useEffect(() => {
    const onActive = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      const value = await AsyncStorage.getItem('@lazy_todo_countdown_state');
      if (!value) return;
      const saved = JSON.parse(value);
      const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);
      const duration = saved.seconds;
      const cycleElapsed = elapsed % duration;
      const remaining = cycleElapsed === 0 ? duration : duration - cycleElapsed;
      const savedGrandTotal = saved.grandTotalSeconds || 0;
      setSeconds(remaining);
      setGrandTotalSeconds(savedGrandTotal + elapsed);
      setCycleStartTime(saved.startTime);
      setMinutes(String(Math.max(1, Math.floor(duration / 60))));
      setRunning(Boolean(saved.running));
    };
    const subscription = AppState.addEventListener('change', onActive);
    return () => subscription.remove();
  }, []);

  const toggle = async () => {
    if (running) {
      setRunning(false);
      setSeconds(Math.max(1, Number(minutes) || DEFAULT_MINUTES) * 60);
      setGrandTotalSeconds(0);
      setCycleStartTime(0);
      await AsyncStorage.removeItem('@lazy_todo_countdown_state');
      return;
    }
    const selectedMinutes = Math.max(1, Number(minutes) || DEFAULT_MINUTES);
    const selectedSeconds = selectedMinutes * 60;
    setMinutes(String(selectedMinutes));
    setSeconds(selectedSeconds);
    setGrandTotalSeconds(0);
    const startTime = Date.now();
    setCycleStartTime(startTime);
    setRunning(true);
    await AsyncStorage.setItem('@lazy_todo_countdown_state', JSON.stringify({ running: true, startTime, seconds: selectedSeconds, grandTotalSeconds: 0 }));
    if (Platform.OS !== 'web') await setSystemAlarm('Countdown Done', selectedSeconds);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <Text style={styles.title}>Countdown</Text>
      </View>
      <View style={styles.controls}>
         <TextInput
          style={[styles.timer, running && styles.runningTimer]}
          value={running ? formatTime(seconds) : formatTime(Math.max(1, Number(minutes) || DEFAULT_MINUTES) * 60)}
          onChangeText={(value) => setMinutes(value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          editable={!running}
          selectTextOnFocus={!running}
          returnKeyType="done"
          onSubmitEditing={toggle}
          accessibilityLabel="Countdown minutes"
        />
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={toggle}>
           <Text style={styles.buttonText}>{running ? 'Reset' : 'Start'}</Text>
        </Pressable>
        <View style={styles.totalBox}>
           <Text style={styles.totalText}>
            {formatTotalTime(grandTotalSeconds)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: APP_COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: '#000000', padding: SPACING.lg, gap: SPACING.md, ...softShadow(0.07, 12, 4) },
  title: { fontSize: 30, fontWeight: '700', color: APP_COLORS.primary, textAlign: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  date: { fontSize: 30, fontWeight: '700', color: APP_COLORS.primary },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, flexWrap: 'nowrap', width: '100%' },
   timer: { width: 110, height: 50, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: RADIUS.md, paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 30, fontWeight: '800', color: APP_COLORS.primary },
  runningTimer: { width: 110 },
  button: { width: 96, height: 50, backgroundColor: APP_COLORS.primary, borderRadius: RADIUS.pill, padding: 5, justifyContent: 'center', alignItems: 'center', ...softShadow(0.12, 8, 3) },
   buttonText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  totalBox: { width: 110, height: 50, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 1, justifyContent: 'center', alignItems: 'center' },
   totalText: { fontSize: 30, fontWeight: '800', color: APP_COLORS.delete },
  pressed: { opacity: 0.7 },
});
