import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_COLORS, RADIUS, SPACING, softShadow } from '../constants';
import { setSystemAlarm } from '../services/pomodoroNotifications';
import { playLongBeep } from '../utils/sound';
import { getLocalDateKey, useTimer } from '../context/TimerContext';

const DEFAULT_MINUTES = 5;
const STORAGE_KEY = '@lazy_todo_countdown_state';

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatTotalTime(seconds: number) {
  const totalMinutes = Math.floor(seconds / 60);
  return `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, '0')}`;
}

function todayLabel() {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[d.getDay()];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const year = String(d.getFullYear()).slice(-2);
  return `Today: ${day}, ${month}/${date}/${year}`;
}

export function PomodoroTimer() {
  const { isTiming, startTimer, pauseTimer } = useTimer();
  const running = isTiming('pomodoro');

  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES));
  const [seconds, setSeconds] = useState(DEFAULT_MINUTES * 60);
  const [grandTotalSeconds, setGrandTotalSeconds] = useState(0);
  const [dateKey, setDateKey] = useState<string>(() => getLocalDateKey());

  const dateKeyRef = useRef(dateKey);
  dateKeyRef.current = dateKey;
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const grandTotalRef = useRef(grandTotalSeconds);
  grandTotalRef.current = grandTotalSeconds;

  const cycleMinutes = Math.max(1, Number(minutes) || DEFAULT_MINUTES);
  const cycleSeconds = cycleMinutes * 60;

  // Reset at 12am handler
  const handleMidnightReset = () => {
    const today = getLocalDateKey();
    pauseTimer('pomodoro');
    const initialSecs = (Math.max(1, Number(minutesRef.current) || DEFAULT_MINUTES)) * 60;
    setSeconds(initialSecs);
    setGrandTotalSeconds(0);
    setDateKey(today);
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        running: false,
        seconds: initialSecs,
        grandTotalSeconds: 0,
        dateKey: today,
        minutes: minutesRef.current,
      }),
    );
  };

  // Restore on mount with date check
  useEffect(() => {
    const restore = async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (!value) return;
        const saved = JSON.parse(value);
        const today = getLocalDateKey();

        // If saved on a previous day, reset at 12am
        if (saved.dateKey && saved.dateKey !== today) {
          handleMidnightReset();
          return;
        }

        const savedMinutes = saved.minutes ? String(saved.minutes) : String(DEFAULT_MINUTES);
        const dur = Number(saved.seconds) > 0 ? Number(saved.seconds) : (Math.max(1, Number(savedMinutes) || DEFAULT_MINUTES)) * 60;
        const savedGrandTotal = saved.grandTotalSeconds || 0;

        setMinutes(savedMinutes);
        setSeconds(dur);
        setGrandTotalSeconds(savedGrandTotal);
        setDateKey(today);
      } catch {
        // ignore restore error
      }
    };
    void restore();
  }, []);

  // AppState change listener (e.g. waking up next day)
  useEffect(() => {
    const onActive = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const today = getLocalDateKey();
      if (today !== dateKeyRef.current) {
        handleMidnightReset();
      }
    };
    const subscription = AppState.addEventListener('change', onActive);
    return () => subscription.remove();
  }, []);

  // Countdown tick effect when running
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      const today = getLocalDateKey();
      if (today !== dateKeyRef.current) {
        handleMidnightReset();
        return;
      }

      setSeconds((prevSecs) => {
        if (prevSecs <= 1) {
          // Cycle completed
          playLongBeep(1.0);
          const nextCycleSecs = (Math.max(1, Number(minutesRef.current) || DEFAULT_MINUTES)) * 60;
          return nextCycleSecs;
        }
        return prevSecs - 1;
      });

      setGrandTotalSeconds((prevTotal) => {
        const next = prevTotal + 1;
        if (next > 0 && next % 60 === 0) {
          playLongBeep(1.0);
        }
        return next;
      });

      // Persist state
      void AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          running: true,
          seconds: secondsRef.current,
          grandTotalSeconds: grandTotalRef.current,
          dateKey: today,
          minutes: minutesRef.current,
        }),
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  const toggle = async () => {
    if (running) {
      // Pause without resetting
      pauseTimer('pomodoro');
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          running: false,
          seconds,
          grandTotalSeconds,
          dateKey: getLocalDateKey(),
          minutes,
        }),
      );
      return;
    }

    // Start or Continue
    const today = getLocalDateKey();
    if (today !== dateKeyRef.current) {
      handleMidnightReset();
    }

    const currentSecs = seconds > 0 ? seconds : cycleSeconds;
    setSeconds(currentSecs);
    startTimer('pomodoro');

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        running: true,
        seconds: currentSecs,
        grandTotalSeconds,
        dateKey: today,
        minutes,
      }),
    );

    if (Platform.OS !== 'web') {
      await setSystemAlarm('Countdown Done', currentSecs);
    }
  };

  const handleManualReset = async () => {
    pauseTimer('pomodoro');
    const resetSecs = cycleSeconds;
    setSeconds(resetSecs);
    setGrandTotalSeconds(0);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        running: false,
        seconds: resetSecs,
        grandTotalSeconds: 0,
        dateKey: getLocalDateKey(),
        minutes,
      }),
    );
  };

  const isContinued = !running && (seconds < cycleSeconds || grandTotalSeconds > 0);
  const buttonLabel = running ? 'Pause' : isContinued ? 'Continue' : 'Start';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{todayLabel()}</Text>
        <Text style={styles.title}>Countdown</Text>
      </View>
      <View style={styles.controls}>
        <TextInput
          style={[styles.timer, running && styles.runningTimer]}
          value={formatTime(seconds)}
          onChangeText={(value) => {
            const cleaned = value.replace(/[^0-9]/g, '');
            setMinutes(cleaned);
            const parsed = Math.max(1, Number(cleaned) || DEFAULT_MINUTES);
            setSeconds(parsed * 60);
          }}
          keyboardType="number-pad"
          editable={!running}
          selectTextOnFocus={!running}
          returnKeyType="done"
          onSubmitEditing={toggle}
          accessibilityLabel="Countdown minutes"
        />
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={toggle}
          onLongPress={handleManualReset}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          accessibilityHint="Tap to start or pause. Long press to reset."
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
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
  title: { fontSize: 25, fontWeight: '700', color: APP_COLORS.primary, textAlign: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  date: { fontSize: 25, fontWeight: '700', color: APP_COLORS.primary },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, flexWrap: 'nowrap', width: '100%' },
  timer: { width: 110, height: 50, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: RADIUS.md, paddingLeft: 1, paddingRight: 1, paddingTop: 1, paddingBottom: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 25, fontWeight: '800', color: APP_COLORS.primary },
  runningTimer: { width: 110 },
  button: { width: 96, height: 50, backgroundColor: APP_COLORS.primary, borderRadius: RADIUS.pill, padding: 5, justifyContent: 'center', alignItems: 'center', ...softShadow(0.12, 8, 3) },
  buttonText: { color: '#fff', fontSize: 25, fontWeight: '800' },
  totalBox: { width: 110, height: 50, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 1, justifyContent: 'center', alignItems: 'center' },
  totalText: { fontSize: 25, fontWeight: '800', color: APP_COLORS.delete },
  pressed: { opacity: 0.7 },
});
