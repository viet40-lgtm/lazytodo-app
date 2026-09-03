import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APP_COLORS } from '../src/constants';
import { TimerProvider } from '../src/context/TimerContext';

const RootContainer = Platform.OS === 'web' ? View : GestureHandlerRootView;

export default function RootLayout() {
  return (
    <RootContainer style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TimerProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: APP_COLORS.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="app" />
          </Stack>
        </TimerProvider>
      </SafeAreaProvider>
    </RootContainer>
  );
}
