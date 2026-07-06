import { Platform } from 'react-native';
import type { TaskSection } from './types';

export const APP_COLORS = {
  background: '#f1f5f1',
  backgroundAlt: '#e8efe8',
  surface: '#ffffff',
  surfaceMuted: '#f7faf7',
  text: '#16241a',
  textMuted: '#5f6f60',
  textSubtle: '#94a294',
  border: '#e2eae2',
  green: '#22c55e',
  primary: '#16a34a',
  primaryDark: '#166534',
  accent: '#0d9488',
  accentSoft: '#ccfbf1',
  delete: '#ef4444',
  fab: '#16a34a',
  fabText: '#ffffff',
  modalOverlay: 'rgba(0, 0, 0, 0.4)',
  inputBg: '#ffffff',
  secondaryBtn: '#eef4ee',
  quote: '#0f766e',
  headerBg: '#14532d',
  headerBgAlt: '#166534',
  headerText: '#ffffff',
  headerAccent: '#86efac',
  headerMuted: '#bbf7d0',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export function softShadow(opacity = 0.08, radius = 12, offsetY = 4) {
  return Platform.select({
    web: {
      boxShadow: `0 ${offsetY}px ${radius}px rgba(20, 40, 25, ${opacity})`,
    },
    default: {
      shadowColor: '#0b2912',
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
      elevation: Math.round(radius / 3),
    },
  });
}

export const SECTION_LABELS: Record<TaskSection, string> = {
  today: 'Today',
  daily: 'Daily',
  weekly: 'Week',
  monthly: 'Month',
  yearly: 'Year',
};

const ALL_SECTIONS: TaskSection[] = ['daily', 'today', 'weekly', 'monthly', 'yearly'];

export function getMoveTargets(from: TaskSection): TaskSection[] {
  return ALL_SECTIONS.filter((section) => section !== from);
}

export interface SectionTheme {
  accent: string;
  accentSoft: string;
  surface: string;
  track: string;
  icon: string;
  tagline: string;
}

export const SECTION_THEMES: Record<TaskSection, SectionTheme> = {
  today: {
    accent: '#16a34a',
    accentSoft: '#dcfce7',
    surface: '#ffffff',
    track: '#bbf7d0',
    icon: '☀️',
    tagline: 'Small wins for right now',
  },
  daily: {
    accent: '#0891b2',
    accentSoft: '#cffafe',
    surface: '#ffffff',
    track: '#a5f3fc',
    icon: '🔄',
    tagline: 'Things you do every day',
  },
  weekly: {
    accent: '#0284c7',
    accentSoft: '#e0f2fe',
    surface: '#ffffff',
    track: '#bae6fd',
    icon: '📋',
    tagline: 'Bigger stuff this week',
  },
  monthly: {
    accent: '#7c3aed',
    accentSoft: '#ede9fe',
    surface: '#ffffff',
    track: '#ddd6fe',
    icon: '🗓️',
    tagline: 'Tasks for this month',
  },
  yearly: {
    accent: '#d97706',
    accentSoft: '#fef3c7',
    surface: '#ffffff',
    track: '#fde68a',
    icon: '⭐',
    tagline: 'The long game, no rush',
  },
};

export function getSectionTheme(section: TaskSection): SectionTheme {
  return SECTION_THEMES[section];
}

export const SCREEN_PADDING = 5;
export const FAB_SIZE = 60;

export const STORAGE_KEY = 'lazy_todo_state_v1';
export const LEGACY_WEB_STORAGE_KEY = 'lazy-todo-state';
