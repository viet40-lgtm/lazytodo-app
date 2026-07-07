import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS, RADIUS, SPACING, softShadow } from '../constants';

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

function beep(freq = 880, duration = 150) {
  if (Platform.OS !== 'web') return Promise.resolve();
  return new Promise<void>((resolve) => {
    try {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      
      osc.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.stop(ctx.currentTime + duration / 1000);
      
      osc.onended = () => {
        ctx.close();
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

export function PomodoroTimer() {
  const [phase, setPhase] = useState<Phase>('work');
  const [secsLeft, setSecsLeft] = useState(WORK_SECS);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);

  const totalSecs = phase === 'work' ? WORK_SECS : BREAK_SECS;
  const progress = secsLeft / totalSecs;

  useEffect(() => {
    if (!running) return;

    const timer = setTimeout(() => {
      if (secsLeft <= 1) {
        const finishedPhase = phase;
        triggerBeeps(finishedPhase === 'work' ? 5 : 3);

        if (finishedPhase === 'work') {
          setPhase('break');
          setSecsLeft(BREAK_SECS);
          setCycles((c) => c + 1);
        } else {
          setPhase('work');
          setSecsLeft(WORK_SECS);
        }
      } else {
        setSecsLeft((prev) => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [running, secsLeft, phase]);

  const handleReset = useCallback(() => {
    setRunning(false);
    setPhase('work');
    setSecsLeft(WORK_SECS);
  }, []);

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
        <View style={[styles.timerPill, { borderColor: accent }]}>
          <Text style={[styles.timerText, { color: accent }]}>{formatTime(secsLeft)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.startStopBtn,
            { backgroundColor: running ? APP_COLORS.delete : accent, borderColor: running ? APP_COLORS.delete : accent },
            pressed && styles.pressed,
          ]}
          onPress={() => setRunning((r) => !r)}
          accessibilityLabel={running ? 'Stop timer' : 'Start timer'}
        >
          <Text style={styles.startStopText}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
      </View>

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
    minWidth: 140,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  timerText: {
    fontSize: 35,
    fontWeight: '800',
    letterSpacing: -1,
  },
  startStopBtn: {
    paddingHorizontal: SPACING.xl + 4,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    borderWidth: 2.5,
    ...softShadow(0.12, 8, 3),
  },
  startStopText: {
    fontSize: 35,
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
});
