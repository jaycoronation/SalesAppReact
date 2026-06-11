// app/_layout.tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from "expo-font";
import { Redirect, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import app from '../firebaseConfig';
import { Colors } from '../utils/colors';
import { SessionManager } from '../utils/sessionManager';

import { useEffect } from 'react';
import {
  setNotificationHandler
} from '../push_notification/notificationService';
import { NotificationProvider } from '../utils/NotificationContext';

// Polyfill DOMException for Hermes
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message: string = '', name: string = 'Error') {
      super(message);
      this.name = name;
    }
  } as any;
}

// // 🔥 Initialize Firebase BEFORE anything else
// initFirebase();

// setNotificationHandler();

// // Register background handler (must be module-level)
// try {
//   registerBackgroundHandler();
// } catch (e) {
//   console.warn('[Layout] Background handler registration failed:', e);
// }

export default function RootLayout() {

  const isLoggedIn = SessionManager.getIsLoggedIn();

  const [fontsLoaded] = useFonts({
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-LightItalic": require("../assets/fonts/Rubik-LightItalic.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-Italic": require("../assets/fonts/Rubik-Italic.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-MediumItalic": require("../assets/fonts/Rubik-MediumItalic.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    "Rubik-SemiBoldItalic": require("../assets/fonts/Rubik-SemiBoldItalic.ttf"),
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-BoldItalic": require("../assets/fonts/Rubik-BoldItalic.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-ExtraBoldItalic": require("../assets/fonts/Rubik-ExtraBoldItalic.ttf"),
    "Rubik-Black": require("../assets/fonts/Rubik-Black.ttf"),
    "Rubik-BlackItalic": require("../assets/fonts/Rubik-BlackItalic.ttf"),
  });

  useEffect(() => {
    // ✅ Move everything here — runs after native bridge is ready
    setNotificationHandler();

    console.log('Firebase initialized:', app.name);

    // try {
    //   registerBackgroundHandler();
    // } catch (e) {
    //   console.warn('[Layout] Background handler registration failed:', e);
    // }

    // registerForPushNotifications();
    // handleQuitStateNotification();

    // const unsub1 = listenForegroundNotifications();
    // const unsub2 = listenNotificationTap();
    // const unsub3 = listenBackgroundNotificationTap();
    // const unsub4 = listenTokenRefresh();

    // return () => {
    //   unsub1(); unsub2(); unsub3(); unsub4();
    // };
  }, []);

  if (!fontsLoaded) return null;

  const theme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: Colors.brandColor,
      secondary: Colors.secondary,
      background: Colors.background,
      surface: Colors.surface,
      error: Colors.error,
    },
  };

  // 🔥 Handle auth redirect here
  if (isLoggedIn === null || !isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <PaperProvider theme={theme}>
          <NotificationProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </NotificationProvider>
        </PaperProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}