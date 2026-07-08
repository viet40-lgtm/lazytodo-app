import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_COLORS, RADIUS, SPACING, softShadow } from '../constants';
import {
  requestPomodoroPermission,
  scheduleTimerNotifications,
  cancelTimerNotifications,
  setSystemAlarm,
} from '../services/pomodoroNotifications';

type Phase = 'work' | 'break';

const WORK_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(secs: number) {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

/** SVG arc for the circular progress ring (web only). */
function CircleRing({ progress, phase }: { progress: number; phase: Phase }) {
  const SIZE = 130;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - progress);
  const color = phase === 'work' ? APP_COLORS.primary : '#0891b2';
  const trackColor = phase === 'work' ? '#dcfce7' : '#cffafe';

  // @ts-ignore - SVG is valid on web
  return (
    <svg
      width={SIZE}
      height={SIZE}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke={trackColor}
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeDasharray={CIRC}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
    </svg>
  );
}

let globalAudioCtx: any = null;

function beep(freq = 880, duration = 150, volume = 0.08) {
  if (Platform.OS !== 'web') return Promise.resolve();
  return new Promise<void>((resolve) => {
    try {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      if (!globalAudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
      const ctx = globalAudioCtx;
      
      // If the context was suspended by autoplay policy, try to resume it
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      
      osc.start(ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
      osc.stop(ctx.currentTime + duration / 1000);
      
      osc.onended = () => {
        resolve();
      };
    } catch (e) {
      console.warn("Audio Context failed", e);
      resolve();
    }
  });
}

async function triggerBeeps(count: number) {
  for (let i = 0; i < count; i++) {
    await beep(880, 150);
    await new Promise((r) => setTimeout(r, 150));
  }
}

// Helper to save timer state to AsyncStorage
const saveTimerState = async (
  running: boolean,
  startTime: number,
  secsLeft: number,
  phase: Phase,
  cycles: number,
  notificationIds: string[]
) => {
  try {
    if (running) {
      await AsyncStorage.setItem(
        '@lazy_todo_pomodoro_state',
        JSON.stringify({ running: true, startTime, secsLeft, phase, cycles, notificationIds })
      );
    } else {
      await AsyncStorage.removeItem('@lazy_todo_pomodoro_state');
    }
  } catch (e) {
    console.warn("Failed to save pomodoro state", e);
  }
};

// Helper to load timer state from AsyncStorage
const loadTimerState = async () => {
  try {
    const json = await AsyncStorage.getItem('@lazy_todo_pomodoro_state');
    if (json) {
      const data = JSON.parse(json);
      return data;
    }
  } catch (e) {
    console.warn("Failed to load pomodoro state", e);
  }
  return null;
};

// Helper to calculate exact current phase and seconds left based on elapsed time since startTime
function calculateCurrentState(
  startTime: number,
  initialSecsLeft: number,
  initialPhase: Phase,
  initialCycles: number,
  now = Date.now()
) {
  const elapsedSecs = Math.floor((now - startTime) / 1000);
  if (elapsedSecs <= 0) {
    return { secsLeft: initialSecsLeft, phase: initialPhase, cycles: initialCycles };
  }

  let tempSecsLeft = initialSecsLeft;
  let tempPhase = initialPhase;
  let tempCycles = initialCycles;
  let remainingElapsed = elapsedSecs;

  // 1. Process current running phase
  if (remainingElapsed >= tempSecsLeft) {
    remainingElapsed -= tempSecsLeft;
    if (tempPhase === 'work') {
      tempCycles += 1;
      tempPhase = 'break';
      tempSecsLeft = BREAK_SECS;
    } else {
      tempPhase = 'work';
      tempSecsLeft = WORK_SECS;
    }
  } else {
    return { secsLeft: tempSecsLeft - remainingElapsed, phase: tempPhase, cycles: tempCycles };
  }

  // 2. Process full cycles (work + break = 30 mins)
  const CYCLE_PERIOD = WORK_SECS + BREAK_SECS;
  const fullCyclesCount = Math.floor(remainingElapsed / CYCLE_PERIOD);
  
  tempCycles += fullCyclesCount;
  remainingElapsed = remainingElapsed % CYCLE_PERIOD;

  // 3. Process remaining time inside current cycle
  if (tempPhase === 'break') {
    if (remainingElapsed >= BREAK_SECS) {
      remainingElapsed -= BREAK_SECS;
      tempPhase = 'work';
      if (remainingElapsed >= WORK_SECS) {
        remainingElapsed -= WORK_SECS;
        tempCycles += 1;
        tempPhase = 'break';
        tempSecsLeft = BREAK_SECS - remainingElapsed;
      } else {
        tempSecsLeft = WORK_SECS - remainingElapsed;
      }
    } else {
      tempSecsLeft = BREAK_SECS - remainingElapsed;
    }
  } else {
    if (remainingElapsed >= WORK_SECS) {
      remainingElapsed -= WORK_SECS;
      tempCycles += 1;
      tempPhase = 'break';
      if (remainingElapsed >= BREAK_SECS) {
        remainingElapsed -= BREAK_SECS;
        tempPhase = 'work';
        tempSecsLeft = WORK_SECS - remainingElapsed;
      } else {
        tempSecsLeft = BREAK_SECS - remainingElapsed;
      }
    } else {
      tempSecsLeft = WORK_SECS - remainingElapsed;
    }
  }

  return { secsLeft: tempSecsLeft, phase: tempPhase, cycles: tempCycles };
}

// Platform-specific notification functions imported from '../services/pomodoroNotifications'

export function PomodoroTimer() {
  const [phase, setPhase] = useState<Phase>('work');
  const [secsLeft, setSecsLeft] = useState(WORK_SECS);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [useSystemAlarm, setUseSystemAlarm] = useState(false);
  const scheduledIdsRef = useRef<string[]>([]);

  const totalSecs = phase === 'work' ? WORK_SECS : BREAK_SECS;
  const progress = secsLeft / totalSecs;

  useEffect(() => {
    AsyncStorage.getItem('@lazy_todo_pomodoro_use_alarm').then((val) => {
      if (val !== null) setUseSystemAlarm(val === 'true');
    });
  }, []);

  const toggleSystemAlarm = useCallback((val: boolean) => {
    setUseSystemAlarm(val);
    AsyncStorage.setItem('@lazy_todo_pomodoro_use_alarm', String(val));
  }, []);

  const handleReset = useCallback(async () => {
    // Play a brief beep for audio confirmation
    beep(440, 60, 0.03);
    if (Platform.OS !== 'web') {
      await cancelTimerNotifications(scheduledIdsRef.current);
    }
    await saveTimerState(false, 0, 0, 'work', 0, []);
    scheduledIdsRef.current = [];
    setRunning(false);
    setPhase('work');
    setSecsLeft(WORK_SECS);
  }, []);

  // 1. Initial State Restoration on Mount
  useEffect(() => {
    let active = true;
    const init = async () => {
      const saved = await loadTimerState();
      if (!active) return;
      if (saved && saved.running) {
        const current = calculateCurrentState(
          saved.startTime,
          saved.secsLeft,
          saved.phase,
          saved.cycles
        );
        setPhase(current.phase);
        setSecsLeft(current.secsLeft);
        setCycles(current.cycles);
        setRunning(true);
        scheduledIdsRef.current = saved.notificationIds || [];
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  // 2. State Restoration on App Foreground Transition
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const saved = await loadTimerState();
        if (saved && saved.running) {
          const current = calculateCurrentState(
            saved.startTime,
            saved.secsLeft,
            saved.phase,
            saved.cycles
          );
          setPhase(current.phase);
          setSecsLeft(current.secsLeft);
          setCycles(current.cycles);
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // 3. Regular Countdown Timer tick
  useEffect(() => {
    if (!running) return;

    const timer = setTimeout(() => {
      if (secsLeft <= 1) {
        const finishedPhase = phase;
        triggerBeeps(finishedPhase === 'work' ? 5 : 3);

        let nextPhase: Phase = 'work';
        let nextSecs = WORK_SECS;
        let nextCycles = cycles;

        if (finishedPhase === 'work') {
          nextPhase = 'break';
          nextSecs = BREAK_SECS;
          nextCycles = cycles + 1;
        } else {
          nextPhase = 'work';
          nextSecs = WORK_SECS;
        }

        setPhase(nextPhase);
        setSecsLeft(nextSecs);
        setCycles(nextCycles);

        // Update rolling notification windows and storage anchors
        if (Platform.OS !== 'web') {
          (async () => {
            await cancelTimerNotifications(scheduledIdsRef.current);
            const ids = await scheduleTimerNotifications(nextPhase, nextSecs);
            scheduledIdsRef.current = ids;
            if (useSystemAlarm) {
              await setSystemAlarm(
                nextPhase === 'work' ? '🍅 Pomodoro Focus Session Done' : '☕ Pomodoro Break Done',
                nextSecs
              );
            }
            await saveTimerState(true, Date.now(), nextSecs, nextPhase, nextCycles, ids);
          })();
        } else {
          saveTimerState(true, Date.now(), nextSecs, nextPhase, nextCycles, []);
        }
      } else {
        setSecsLeft((prev) => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [running, secsLeft, phase, cycles, useSystemAlarm]);

  const isWork = phase === 'work';
  const accent = isWork ? APP_COLORS.primary : '#0891b2';
  const accentSoft = isWork ? '#dcfce7' : '#cffafe';
  const phaseLabel = isWork ? '🍅 Pomodoro technique' : '☕ Break';

  return (
    <View style={[styles.card, { borderColor: accentSoft }]}>
      {/* Phase label + cycle count */}
      <View style={styles.topRow}>
        <Text style={[styles.phaseLabel, { color: accent }]}>{phaseLabel}</Text>
        {cycles > 0 && (
          <View style={[styles.cyclePill, { backgroundColor: accentSoft }]}>
            <Text style={[styles.cycleText, { color: accent }]}>
              {cycles} {cycles === 1 ? 'cycle' : 'cycles'} done
            </Text>
          </View>
        )}
      </View>

      {/* Timer + controls */}
      <View style={styles.centerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.timerPill,
            { borderColor: accent },
            pressed && styles.pressed,
          ]}
          onPress={handleReset}
          accessibilityLabel="Reset timer to 25 minutes"
        >
          <Text style={[styles.timerText, { color: accent }]}>{formatTime(secsLeft)}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.startStopBtn,
            { backgroundColor: running ? APP_COLORS.delete : accent, borderColor: running ? APP_COLORS.delete : accent },
            pressed && styles.pressed,
          ]}
          onPress={async () => {
            // Unlock Audio Context on direct user interaction (autoplay compliance)
            if (Platform.OS === 'web') {
              try {
                // @ts-ignore
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                  if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
                  if (globalAudioCtx.state === 'suspended') {
                    globalAudioCtx.resume();
                  }
                }
              } catch (e) {
                console.warn("Failed to resume AudioContext", e);
              }
            }

            // Play short click feedback beep
            beep(600, 50, 0.03);

            const nextRunning = !running;
            if (nextRunning) {
              let ids: string[] = [];
              if (Platform.OS !== 'web') {
                const granted = await requestPomodoroPermission();
                if (granted) {
                  ids = await scheduleTimerNotifications(phase, secsLeft);
                }
                if (useSystemAlarm) {
                  await setSystemAlarm(
                    phase === 'work' ? '🍅 Pomodoro Focus Session Done' : '☕ Pomodoro Break Done',
                    secsLeft
                  );
                }
              }
              const now = Date.now();
              await saveTimerState(true, now, secsLeft, phase, cycles, ids);
              scheduledIdsRef.current = ids;
              setRunning(true);
            } else {
              if (Platform.OS !== 'web') {
                await cancelTimerNotifications(scheduledIdsRef.current);
              }
              await saveTimerState(false, 0, 0, 'work', 0, []);
              scheduledIdsRef.current = [];
              setRunning(false);
            }
          }}
          accessibilityLabel={running ? 'Stop timer' : 'Start timer'}
        >
          <Text style={styles.startStopText}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
      </View>

      {/* Alarm Type Option */}
      <View style={styles.optionRow}>
        <Pressable
          onPress={() => toggleSystemAlarm(false)}
          accessibilityRole="button"
          accessibilityState={{ selected: !useSystemAlarm }}
          style={[
            styles.chip,
            !useSystemAlarm && { backgroundColor: accentSoft, borderColor: accent }
          ]}
        >
          <Text style={[styles.chipText, !useSystemAlarm && { color: accent }]}>
            🔔  Notification
          </Text>
        </Pressable>
        <Pressable
          onPress={() => toggleSystemAlarm(true)}
          accessibilityRole="button"
          accessibilityState={{ selected: useSystemAlarm }}
          style={[
            styles.chip,
            useSystemAlarm && { backgroundColor: accentSoft, borderColor: accent }
          ]}
        >
          <Text style={[styles.chipText, useSystemAlarm && { color: accent }]}>
            ⏰  Alarm-Android
          </Text>
        </Pressable>
      </View>
      {useSystemAlarm && (
        <Text style={[styles.disclaimerText, { color: accent }]}>
          {Platform.OS === 'android' 
            ? '⚠️ Note: Starting the timer will register a system alarm. If you pause early, you must delete it manually in the Clock app.'
            : 'Note: Programmatic system alarms are only supported on Android. This platform will use standard notification alerts instead.'}
        </Text>
      )}

      {/* Progress bar */}
      <View style={[styles.barTrack, { backgroundColor: accentSoft }]}>
        <View
          style={[
            styles.barFill,
            // @ts-ignore width as percentage string is fine on web
            { width: `${(progress * 100).toFixed(2)}%`, backgroundColor: accent },
          ]}
        />
      </View>
    </View>
  );
}

const RING_SIZE = 130;

const styles = StyleSheet.create({
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...softShadow(0.07, 12, 4),
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: APP_COLORS.textSubtle,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cyclePill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
  cycleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  timerPill: {
    paddingHorizontal: SPACING.xl + 4,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 170,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  timerText: {
    fontSize: 45,
    fontWeight: '800',
    letterSpacing: -1,
  },
  startStopBtn: {
    paddingHorizontal: SPACING.xl + 4,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 170,
    borderWidth: 2.5,
    ...softShadow(0.12, 8, 3),
  },
  startStopText: {
    fontSize: 45,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  pressed: {
    opacity: 0.7,
  },
  barTrack: {
    height: 5,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  chipText: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
  },
  disclaimerText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: -SPACING.xs,
    lineHeight: 16,
  },
});
