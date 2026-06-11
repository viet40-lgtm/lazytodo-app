# Lazy To-Do

A mobile-first to-do app for extremely lazy, unmotivated users who get overwhelmed easily.

Built with **Expo + React Native** (same stack pattern as golfls-app).

## Features

- Single screen — no login, projects, folders, tags, priorities, or calendar
- Random motivational quote on each visit
- Today's progress bar
- Swipe left to delete, tap to edit
- Optional reminders and recurring tasks (daily / weekly / monthly)
- Confetti celebration when all tasks are done
- Local device storage only (`AsyncStorage`, key: `lazy_todo_state_v1`)

## Quick start (phone testing)

```bash
npm install
npx expo start
```

1. Install **Expo Go** on your Android phone
2. Scan the QR code from the terminal
3. The app opens instantly — no APK needed for daily dev

## Build APK for device testing

```bash
npm install -g eas-cli
eas login
eas build:configure
npm run build:android:preview
```

When the build finishes, download the APK from the EAS link and install it on your phone.

## Google Play (production)

```bash
npm run build:android:production
eas submit -p android --profile production
```

Use **Internal testing** in Google Play Console before a public release.

## Project layout

```
app/                 Expo Router screens
src/types/           TypeScript models
src/services/        AsyncStorage + notifications
src/hooks/           Task state
src/components/      UI
```

## Data model

```ts
interface Task {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: number;      // ms timestamp
  reminder?: string;         // "HH:mm"
  recurring?: 'daily' | 'weekly' | 'monthly';
  createdAt: number;         // ms timestamp
}
```
