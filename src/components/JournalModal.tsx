import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SPACING } from '../constants';

interface JournalEntry {
  id: string;
  date: string;
  thoughts: string;
  gratefulness: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'lazy_todo_journals_v1';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayKey(): string {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function mkKey(y: number, m: number, d: number): string {
  return y + '-' + pad(m + 1) + '-' + pad(d);
}

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DOW_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function fmtDate(k: string): string {
  const [y, m, d] = k.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DOW_FULL[date.getDay()];
  const yy = String(y).slice(-2);
  return dayName + ', ' + m + '/' + d + '/' + yy;
}

function calDays(y: number, m: number): (number | null)[] {
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function loadAll(): JournalEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

function saveAll(es: JournalEntry[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(es));
    }
  } catch {}
}

export interface JournalModalProps {
  visible: boolean;
  journals: JournalEntry[];
  onSaveJournals: (journals: JournalEntry[]) => void;
  onClose: () => void;
}

type PageView = 'list' | 'edit';

export function JournalModal({ visible, journals, onSaveJournals, onClose }: JournalModalProps) {
  const [entries, setEntries] = useState<JournalEntry[]>(journals);
  const [pv, setPv] = useState<PageView>('edit');
  const [active, setActive] = useState<JournalEntry | null>(null);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = new Date();
  const [calY, setCalY] = useState(now.getFullYear());
  const [calM, setCalM] = useState(now.getMonth());

  // Keep local entries in sync whenever journals from cloud/props change
  useEffect(() => {
    setEntries(journals);
    if (active) {
      const updated = journals.find((e) => e.id === active.id || e.date === active.date);
      if (updated && updated.updatedAt > active.updatedAt) {
        setActive({ ...updated });
      }
    }
  }, [journals]);

  useEffect(() => {
    if (!visible) return;
    openToday(journals);
  }, [visible]);

  function openToday(all: JournalEntry[]) {
    const k = todayKey();
    const ex = all.find((e) => e.date === k);
    setActive(
      ex
        ? { ...ex }
        : {
            id: 'j_' + Date.now(),
            date: k,
            thoughts: '',
            gratefulness: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
    );
    const d = new Date();
    setCalY(d.getFullYear());
    setCalM(d.getMonth());
    setPv('edit');
  }

  function persist(entry: JournalEntry) {
    setEntries((prev) => {
      const i = prev.findIndex((e) => e.id === entry.id || e.date === entry.date);
      const up =
        i >= 0
          ? prev.map((e, j) => (j === i ? entry : e))
          : [entry, ...prev];
      onSaveJournals(up);
      saveAll(up);
      return up;
    });
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1500);
  }

  function onChg(
    field: keyof Pick<JournalEntry, 'thoughts' | 'gratefulness'>,
    val: string
  ) {
    if (!active) return;
    const up = { ...active, [field]: val, updatedAt: Date.now() };
    setActive(up);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(up), 700);
  }

  function openEntry(e: JournalEntry) {
    setActive({ ...e });
    const [y, m] = e.date.split('-').map(Number);
    setCalY(y);
    setCalM(m - 1);
    setPv('edit');
  }

  function delEntry(id: string) {
    setEntries((prev) => {
      const up = prev.filter((e) => e.id !== id);
      onSaveJournals(up);
      saveAll(up);
      return up;
    });
  }

  function openCalDay(day: number) {
    const k = mkKey(calY, calM, day);
    const ex = entries.find((e) => e.date === k);
    setActive(
      ex
        ? { ...ex }
        : {
            id: 'j_' + Date.now(),
            date: k,
            thoughts: '',
            gratefulness: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
    );
    setPv('edit');
  }

  // Days with data (non-empty thoughts or gratefulness)
  const entryDatesWithData = new Set<string>();
  entries.forEach((e) => {
    if (
      (e.thoughts && e.thoughts.trim().length > 0) ||
      (e.gratefulness && e.gratefulness.trim().length > 0)
    ) {
      entryDatesWithData.add(e.date);
    }
  });
  if (
    active &&
    ((active.thoughts && active.thoughts.trim().length > 0) ||
      (active.gratefulness && active.gratefulness.trim().length > 0))
  ) {
    entryDatesWithData.add(active.date);
  }

  const isToday = active?.date === todayKey();
  const cells = calDays(calY, calM);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.screen}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.hLeft}>
            <Text style={s.title}>📓 Journals</Text>
            {saved && <Text style={s.badge}>✓ Saved</Text>}
          </View>
          <View style={s.hRight}>
            <Pressable
              style={[s.tab, pv === 'edit' && s.tabOn]}
              onPress={() => openToday(entries)}
            >
              <Text style={[s.tabTxt, pv === 'edit' && s.tabTxtOn]}>Today</Text>
            </Pressable>
            <Pressable
              style={[s.tab, pv === 'list' && s.tabOn]}
              onPress={() => setPv('list')}
            >
              <Text style={[s.tabTxt, pv === 'list' && s.tabTxtOn]}>All</Text>
            </Pressable>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeX}>X</Text>
            </Pressable>
          </View>
        </View>

        {/* Edit View */}
        {pv === 'edit' && active ? (
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.dateLabel}>
              {isToday ? 'Today: ' + fmtDate(active.date) : fmtDate(active.date)}
            </Text>

            <Sec
              label="Thoughts"
              ph="What is on your mind today?"
              val={active.thoughts}
              onCh={(v) => onChg('thoughts', v)}
            />

            <Sec
              label="Gratefulness"
              ph="What are you grateful for today?"
              val={active.gratefulness}
              onCh={(v) => onChg('gratefulness', v)}
            />

            {/* Monthly Calendar at bottom with '*' for days with data */}
            <View style={s.cal}>
              <View style={s.calHeader}>
                <Pressable
                  style={s.calNav}
                  onPress={() => {
                    if (calM === 0) {
                      setCalM(11);
                      setCalY((y) => y - 1);
                    } else {
                      setCalM((m) => m - 1);
                    }
                  }}
                >
                  <Text style={s.calNavTxt}>{'<'}</Text>
                </Pressable>
                <Text style={s.calTitle}>
                  {MONTH_NAMES[calM]} {calY}
                </Text>
                <Pressable
                  style={s.calNav}
                  onPress={() => {
                    if (calM === 11) {
                      setCalM(0);
                      setCalY((y) => y + 1);
                    } else {
                      setCalM((m) => m + 1);
                    }
                  }}
                >
                  <Text style={s.calNavTxt}>{'>'}</Text>
                </Pressable>
              </View>

              <View style={s.calGrid}>
                {DOW.map((d) => (
                  <Text key={d} style={s.calDow}>
                    {d}
                  </Text>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <View key={'empty_' + i} style={s.calCell} />;
                  const k = mkKey(calY, calM, day);
                  const hasData = entryDatesWithData.has(k);
                  const isAct = k === active.date;
                  const isTdy = k === todayKey();

                  return (
                    <Pressable
                      key={k}
                      style={[
                        s.calCell,
                        isAct && s.calCellAct,
                        isTdy && !isAct && s.calCellToday,
                      ]}
                      onPress={() => openCalDay(day)}
                    >
                      <Text
                        style={[
                          s.calDay,
                          isAct && s.calDayAct,
                          isTdy && !isAct && s.calDayToday,
                        ]}
                      >
                        {day}
                      </Text>
                      {hasData && (
                        <Text style={[s.calStar, isAct && s.calStarAct]}>*</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        ) : null}

        {/* List View */}
        {pv === 'list' ? (
          <ScrollView
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            {entries.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyTxt}>No entries yet. Start writing today!</Text>
              </View>
            ) : (
              entries
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((e) => (
                  <Pressable
                    key={e.id}
                    style={s.card}
                    onPress={() => openEntry(e)}
                  >
                    <View style={s.cardRow}>
                      <Text style={s.cardDate}>{fmtDate(e.date)}</Text>
                      <Pressable
                        style={s.delBtn}
                        onPress={() => delEntry(e.id)}
                        hitSlop={8}
                      >
                        <Text style={s.delTxt}>Delete</Text>
                      </Pressable>
                    </View>
                    {e.thoughts ? (
                      <Text style={s.prev} numberOfLines={2}>
                        {e.thoughts}
                      </Text>
                    ) : null}
                    {e.gratefulness ? (
                      <Text style={s.prev} numberOfLines={1}>
                        🙏 {e.gratefulness}
                      </Text>
                    ) : null}
                  </Pressable>
                ))
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

interface SecProps {
  label: string;
  ph: string;
  val: string;
  onCh: (v: string) => void;
}

function Sec({ label, ph, val, onCh }: SecProps) {
  return (
    <View style={s.section}>
      <Text style={s.secLabel}>{label}</Text>
      <TextInput
        style={s.input}
        placeholder={ph}
        placeholderTextColor={APP_COLORS.textSubtle}
        multiline
        value={val}
        onChangeText={onCh}
        textAlignVertical="top"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    backgroundColor: APP_COLORS.headerBg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#fff',
  },
  badge: {
    fontSize: 25,
    color: APP_COLORS.headerAccent,
    fontWeight: '600',
  },
  hRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tabOn: {
    backgroundColor: 'rgba(134,239,172,0.2)',
    borderColor: APP_COLORS.headerAccent,
  },
  tabTxt: {
    fontSize: 25,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  tabTxtOn: {
    color: APP_COLORS.headerAccent,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 25,
    fontWeight: '800',
    color: '#fff',
  },
  content: {
    padding: 13,
    gap: SPACING.xl,
    paddingBottom: 40,
  },
  dateLabel: {
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.primary,
    marginBottom: SPACING.xs,
  },
  section: {
    gap: SPACING.sm,
  },
  secLabel: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.text,
  },
  input: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: APP_COLORS.border,
    padding: SPACING.md,
    fontSize: 25,
    color: APP_COLORS.text,
    minHeight: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING.md,
  },
  emptyTxt: {
    fontSize: 25,
    color: APP_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 34,
  },
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.primary,
    flex: 1,
  },
  delBtn: {
    padding: 6,
  },
  delTxt: {
    fontSize: 25,
    color: APP_COLORS.delete,
    fontWeight: '700',
  },
  prev: {
    fontSize: 25,
    color: APP_COLORS.textMuted,
    lineHeight: 30,
  },
  cal: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: APP_COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  calTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.text,
  },
  calNav: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: APP_COLORS.surfaceMuted,
  },
  calNavTxt: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.primary,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDow: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.textMuted,
    paddingVertical: 4,
  },
  calCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 48,
    position: 'relative',
  },
  calCellAct: {
    backgroundColor: APP_COLORS.primary,
  },
  calCellToday: {
    backgroundColor: APP_COLORS.accentSoft,
  },
  calDay: {
    fontSize: 22,
    color: APP_COLORS.text,
    fontWeight: '600',
  },
  calDayAct: {
    color: '#fff',
    fontWeight: '800',
  },
  calDayToday: {
    color: APP_COLORS.primary,
    fontWeight: '700',
  },
  calStar: {
    fontSize: 22,
    color: APP_COLORS.delete,
    fontWeight: '900',
    lineHeight: 18,
    position: 'absolute',
    top: 2,
    right: 6,
  },
  calStarAct: {
    color: '#fff',
  },
});
