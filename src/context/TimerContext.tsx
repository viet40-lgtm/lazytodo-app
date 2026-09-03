import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playLongBeep } from '../utils/sound';

const TIMER_STORAGE_KEY = '@lazy_todo_active_timer_state';

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMsUntilNextMidnight(now = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1000, nextMidnight.getTime() - now.getTime());
}

export function formatTimerDisplay(sec: number): string {
  if (sec >= 3600) {
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

interface TimerRecord {
  elapsedSeconds: number;
  loggedMinutes: number;
}

interface TimerContextValue {
  activeTimerId: string | null;
  getElapsedSeconds: (id: string) => number;
  isTiming: (id: string) => boolean;
  startTimer: (id: string, onMinuteTick?: () => void) => void;
  pauseTimer: (id?: string) => void;
  toggleTimer: (id: string, onMinuteTick?: () => void) => void;
  registerMinuteTick: (id: string, callback: () => void) => () => void;
  resetAllTimers: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerData, setTimerData] = useState<Record<string, TimerRecord>>({});
  const [dateKey, setDateKey] = useState<string>(() => getLocalDateKey());

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeTimerId;

  const timerDataRef = useRef<Record<string, TimerRecord>>({});
  timerDataRef.current = timerData;

  const dateKeyRef = useRef<string>(dateKey);
  dateKeyRef.current = dateKey;

  const callbacksRef = useRef<Record<string, () => void>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistState = useCallback(
    (currentActive: string | null, data: Record<string, TimerRecord>, key: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        void AsyncStorage.setItem(
          TIMER_STORAGE_KEY,
          JSON.stringify({
            activeTimerId: currentActive,
            timerData: data,
            dateKey: key,
            savedAt: Date.now(),
          }),
        );
      }, 300);
    },
    [],
  );

  const resetAllAtMidnight = useCallback(() => {
    // Flush any unlogged time on currently active timer
    const currentId = activeIdRef.current;
    if (currentId && callbacksRef.current[currentId]) {
      const rec = timerDataRef.current[currentId] || { elapsedSeconds: 0, loggedMinutes: 0 };
      const unlogged = rec.elapsedSeconds - rec.loggedMinutes * 60;
      if (unlogged >= 30 || (rec.loggedMinutes === 0 && unlogged > 0)) {
        try {
          callbacksRef.current[currentId]();
        } catch {
          // ignore
        }
      }
    }

    const nextDateKey = getLocalDateKey();
    activeIdRef.current = null;
    timerDataRef.current = {};
    dateKeyRef.current = nextDateKey;

    setActiveTimerId(null);
    setTimerData({});
    setDateKey(nextDateKey);

    void AsyncStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        activeTimerId: null,
        timerData: {},
        dateKey: nextDateKey,
        savedAt: Date.now(),
      }),
    );
  }, []);

  // Restore state from AsyncStorage on initial mount
  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
        if (!raw || !mounted) return;
        const parsed = JSON.parse(raw);
        const todayKey = getLocalDateKey();

        // If saved state is from a previous day, 12am reset applies immediately
        if (parsed.dateKey !== todayKey) {
          await AsyncStorage.setItem(
            TIMER_STORAGE_KEY,
            JSON.stringify({
              activeTimerId: null,
              timerData: {},
              dateKey: todayKey,
              savedAt: Date.now(),
            }),
          );
          return;
        }

        const restoredData: Record<string, TimerRecord> = parsed.timerData || {};
        timerDataRef.current = restoredData;
        dateKeyRef.current = todayKey;

        setTimerData(restoredData);
        setDateKey(todayKey);

        // Keep activeTimerId paused on initial reload to allow user to continue manually
        setActiveTimerId(null);
        activeIdRef.current = null;
      } catch {
        // ignore restore error
      }
    };

    void restore();
    return () => {
      mounted = false;
    };
  }, []);

  // Schedule exact 12:00:00 AM midnight reset timer
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnight = () => {
      const ms = getMsUntilNextMidnight();
      timeoutId = setTimeout(() => {
        resetAllAtMidnight();
        scheduleMidnight();
      }, ms);
    };

    scheduleMidnight();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [resetAllAtMidnight]);

  // AppState listener to handle waking up after midnight while in background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const todayKey = getLocalDateKey();
        if (todayKey !== dateKeyRef.current) {
          resetAllAtMidnight();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [resetAllAtMidnight]);

  // Master single-ticker interval: only runs when activeTimerId is set
  useEffect(() => {
    if (!activeTimerId) return;

    const interval = setInterval(() => {
      const todayKey = getLocalDateKey();
      if (todayKey !== dateKeyRef.current) {
        resetAllAtMidnight();
        return;
      }

      const currentId = activeIdRef.current;
      if (!currentId) return;

      const prev = timerDataRef.current[currentId] || { elapsedSeconds: 0, loggedMinutes: 0 };
      const nextSeconds = prev.elapsedSeconds + 1;
      let nextLoggedMinutes = prev.loggedMinutes;

      // Every full 60 seconds of accumulation
      if (nextSeconds > 0 && nextSeconds % 60 === 0) {
        playLongBeep(1.0);
        nextLoggedMinutes += 1;
        const cb = callbacksRef.current[currentId];
        if (cb) {
          try {
            cb();
          } catch {
            // ignore
          }
        }
      }

      const updatedRecord = {
        elapsedSeconds: nextSeconds,
        loggedMinutes: nextLoggedMinutes,
      };

      timerDataRef.current = {
        ...timerDataRef.current,
        [currentId]: updatedRecord,
      };

      setTimerData((data) => ({
        ...data,
        [currentId]: updatedRecord,
      }));

      persistState(currentId, timerDataRef.current, todayKey);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimerId, persistState, resetAllAtMidnight]);

  const registerMinuteTick = useCallback((id: string, callback: () => void) => {
    callbacksRef.current[id] = callback;
    return () => {
      if (callbacksRef.current[id] === callback) {
        delete callbacksRef.current[id];
      }
    };
  }, []);

  const pauseTimer = useCallback(
    (id?: string) => {
      const currentActive = activeIdRef.current;
      if (!id || id === currentActive) {
        setActiveTimerId(null);
        activeIdRef.current = null;
        persistState(null, timerDataRef.current, dateKeyRef.current);
      }
    },
    [persistState],
  );

  const startTimer = useCallback(
    (id: string, onMinuteTick?: () => void) => {
      if (onMinuteTick) {
        callbacksRef.current[id] = onMinuteTick;
      }

      const todayKey = getLocalDateKey();
      if (todayKey !== dateKeyRef.current) {
        resetAllAtMidnight();
      }

      // Initialize record if missing so it starts from 0 or continues from existing
      if (!timerDataRef.current[id]) {
        const initRec = { elapsedSeconds: 0, loggedMinutes: 0 };
        timerDataRef.current = { ...timerDataRef.current, [id]: initRec };
        setTimerData((prev) => ({ ...prev, [id]: initRec }));
      }

      // Single active timer: replacing active timer pauses the previous one
      setActiveTimerId(id);
      activeIdRef.current = id;
      persistState(id, timerDataRef.current, todayKey);
    },
    [persistState, resetAllAtMidnight],
  );

  const toggleTimer = useCallback(
    (id: string, onMinuteTick?: () => void) => {
      if (activeIdRef.current === id) {
        pauseTimer(id);
      } else {
        startTimer(id, onMinuteTick);
      }
    },
    [pauseTimer, startTimer],
  );

  const getElapsedSeconds = useCallback((id: string): number => {
    return timerDataRef.current[id]?.elapsedSeconds || 0;
  }, []);

  const isTiming = useCallback((id: string): boolean => {
    return activeTimerId === id;
  }, [activeTimerId]);

  const resetAllTimers = useCallback(() => {
    resetAllAtMidnight();
  }, [resetAllAtMidnight]);

  return (
    <TimerContext.Provider
      value={{
        activeTimerId,
        getElapsedSeconds,
        isTiming,
        startTimer,
        pauseTimer,
        toggleTimer,
        registerMinuteTick,
        resetAllTimers,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return ctx;
}
