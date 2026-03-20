// app/_layout.tsx
import { SessionManager } from '@/utils/sessionManager';
import { useFonts } from "expo-font";
import { MD3LightTheme, PaperProvider } from "react-native-paper";

import { Colors } from '@/utils/colors';
import { Stack } from 'expo-router';

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
  const theme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: Colors.primary,
      secondary: Colors.secondary,
      background: Colors.background,
      surface: Colors.surface,
      error: Colors.error,
    },
  };

  return (
    <PaperProvider theme={theme}>
<Stack screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="login" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
    </PaperProvider>
  );
}