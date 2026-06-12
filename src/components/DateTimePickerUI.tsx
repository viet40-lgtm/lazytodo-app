import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SCREEN_PADDING, SPACING, softShadow } from '../constants';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function DateTimePickerUI({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const openModal = () => {
    let d = new Date();
    if (value) {
      d = new Date(value);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    setTempDate(d);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const str = `${tempDate.getFullYear()}-${pad(tempDate.getMonth() + 1)}-${pad(tempDate.getDate())}T${pad(tempDate.getHours())}:${pad(tempDate.getMinutes())}`;
    onChange(str);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setTempDate(newDate);
  };

  const setDay = (day: number) => {
    const newDate = new Date(tempDate);
    newDate.setDate(day);
    setTempDate(newDate);
  };

  const adjustHour = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setHours(newDate.getHours() + delta);
    setTempDate(newDate);
  };

  const adjustMinute = (delta: number) => {
    const newDate = new Date(tempDate);
    newDate.setMinutes(newDate.getMinutes() + delta);
    setTempDate(newDate);
  };

  const toggleAmPm = () => {
    const newDate = new Date(tempDate);
    const current = newDate.getHours();
    newDate.setHours(current >= 12 ? current - 12 : current + 12);
    setTempDate(newDate);
  };

  const year = tempDate.getFullYear();
  const month = tempDate.getMonth();
  const currentDay = tempDate.getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const hours24 = tempDate.getHours();
  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;
  const minutes = tempDate.getMinutes();

  const formattedValue = value ? new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';

  return (
    <>
      <Pressable style={styles.inputTrigger} onPress={openModal}>
        <Text style={[styles.inputText, !value && styles.inputPlaceholder]}>
          {value ? formattedValue : 'Select Date & Time...'}
        </Text>
      </Pressable>

      <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Reminder</Text>
            <Pressable onPress={() => setIsOpen(false)} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SCREEN_PADDING, gap: SPACING.xl }}>
            
            {/* Calendar View */}
            <View style={styles.card}>
              <View style={styles.monthRow}>
                <Pressable onPress={() => changeMonth(-1)} style={styles.arrowBtn}><Text style={styles.arrowText}>←</Text></Pressable>
                <Text style={styles.monthText}>{MONTHS[month]} {year}</Text>
                <Pressable onPress={() => changeMonth(1)} style={styles.arrowBtn}><Text style={styles.arrowText}>→</Text></Pressable>
              </View>

              <View style={styles.daysHeader}>
                {DAYS_OF_WEEK.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
              </View>

              <View style={styles.grid}>
                {days.map((day, idx) => {
                  if (!day) return <View key={`empty-${idx}`} style={styles.cell} />;
                  const isSelected = day === currentDay;
                  return (
                    <Pressable
                      key={day}
                      style={[styles.cell, isSelected && styles.cellSelected]}
                      onPress={() => setDay(day)}
                    >
                      <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Time View */}
            <View style={[styles.card, { alignItems: 'center' }]}>
              <Text style={styles.timeLabel}>Time</Text>
              <View style={styles.timeRow}>
                
                <View style={styles.timeCol}>
                  <Pressable onPress={() => adjustHour(1)} style={styles.timeAdjustBtn}><Text style={styles.arrowText}>+</Text></Pressable>
                  <Text style={styles.timeValue}>{hours12}</Text>
                  <Pressable onPress={() => adjustHour(-1)} style={styles.timeAdjustBtn}><Text style={styles.arrowText}>-</Text></Pressable>
                </View>
                
                <Text style={styles.timeColon}>:</Text>

                <View style={styles.timeCol}>
                  <Pressable onPress={() => adjustMinute(15)} style={styles.timeAdjustBtn}><Text style={styles.arrowText}>+</Text></Pressable>
                  <Text style={styles.timeValue}>{minutes.toString().padStart(2, '0')}</Text>
                  <Pressable onPress={() => adjustMinute(-15)} style={styles.timeAdjustBtn}><Text style={styles.arrowText}>-</Text></Pressable>
                </View>

                <Pressable onPress={toggleAmPm} style={styles.ampmBtn}>
                  <Text style={styles.ampmText}>{isPM ? 'PM' : 'AM'}</Text>
                </Pressable>

              </View>
            </View>

          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={handleConfirm}>
              <Text style={styles.primaryBtnText}>Confirm Date & Time</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inputTrigger: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: APP_COLORS.surface,
    ...softShadow(0.04, 6, 2),
    width: '100%',
  },
  inputText: {
    fontSize: 25,
    color: APP_COLORS.text,
  },
  inputPlaceholder: {
    color: APP_COLORS.textSubtle,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SCREEN_PADDING,
    backgroundColor: APP_COLORS.headerBg,
    ...softShadow(0.1, 8, 4),
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: APP_COLORS.headerText,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: APP_COLORS.headerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: APP_COLORS.headerMuted,
  },
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...softShadow(0.05, 8, 2),
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  monthText: {
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  arrowBtn: {
    padding: SPACING.sm,
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
  },
  arrowText: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.primary,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.full,
  },
  cellText: {
    fontSize: 20,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  cellTextSelected: {
    color: APP_COLORS.fabText,
    fontWeight: '700',
  },
  timeLabel: {
    fontSize: 25,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timeCol: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timeAdjustBtn: {
    backgroundColor: APP_COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: APP_COLORS.text,
  },
  timeColon: {
    fontSize: 32,
    fontWeight: '800',
    color: APP_COLORS.textMuted,
    paddingBottom: 4,
  },
  ampmBtn: {
    backgroundColor: APP_COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.md,
  },
  ampmText: {
    fontSize: 25,
    fontWeight: '800',
    color: APP_COLORS.primaryDark,
  },
  actions: {
    padding: SCREEN_PADDING,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
  },
  primaryBtn: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...softShadow(0.2, 12, 4),
  },
  primaryBtnText: {
    color: APP_COLORS.fabText,
    fontSize: 25,
    fontWeight: '700',
  },
});
