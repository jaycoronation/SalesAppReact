import { loginAPI } from "@/network/authService";
import { AppUtils, isValidEmail } from "@/utils/AppUtils";
import { Colors } from "@/utils/colors";
import { Fonts } from "@/utils/fonts";
import { SessionManager } from "@/utils/sessionManager";
import { AuthorizationStatus, getMessaging, getToken, requestPermission } from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TextInput } from "react-native-paper";


// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg: '#FFFFFF',
  surface: '#F9F9FB',
  surfaceElevated: '#FFFFFF',
  border: '#E4E4EC',
  borderFocus: '#E2101F',
  accent: '#E2101F',
  accentDim: '#F9A8AD',
  accentGlow: 'rgba(226,16,31,0.10)',
  accentLight: '#FFF1F1',
  text: '#0F0F14',
  textSecondary: '#6B6B7E',
  textMuted: '#AFAFBF',
  white: '#FFFFFF',
}

// ─── Animated Input ───────────────────────────────────────────────────────────
function ThemedInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  textContentType,
  autoCapitalize,
  editable,
  onSubmitEditing,
  rightIcon,
}: any) {
  const [focused, setFocused] = useState(false)
  const borderAnim = useRef(new Animated.Value(0)).current

  const onFocus = () => {
    setFocused(true)
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start()
  }
  const onBlur = () => {
    setFocused(false)
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start()
  }

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [T.border, T.borderFocus],
  })

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [T.surface, T.accentLight],
  })

  return (
    <Animated.View style={[styles.inputWrap, { borderColor, backgroundColor: bgColor }]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        selectionColor={Colors.brandColor}
        textContentType={textContentType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        editable={editable !== false}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        mode="flat"
        underlineColor="transparent"
        activeUnderlineColor="transparent"
        textColor={T.text}
        placeholderTextColor={T.textMuted}
        contentStyle={styles.inputContent}
        style={styles.inputInner}
        theme={{
          colors: {
            onSurfaceVariant: focused ? T.accent : T.textSecondary,
            background: 'transparent',
          },
        }}
        right={rightIcon}
      />
    </Animated.View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [secureText, setSecureText] = useState(true)
  const router = useRouter()

  const handleLogin = () => {
    if (!username) {
      AppUtils.showToast('Please enter email')
      return
    }
    if (!isValidEmail(username)) {
      AppUtils.showToast('Please enter a valid email')
      return
    }
    if (!password) {
      AppUtils.showToast('Please enter password')
      return
    }
    callAPI()
  }

  const callAPI = async () => {
    try {
      setIsLoading(true)

      const deviceToken = await SessionManager.getFCMToken();
      console.log("deviceToken", deviceToken);

      const modelName = Device.modelName

      const res = await loginAPI(username, password, deviceToken || '', modelName || '', Platform.OS == 'ios' ? 'ios' : 'android')
      if (res.success && res.data.success === 1) {
        await SessionManager.setSession(res.data)
        router.replace('/(main)/dashboard/BottomNavigation')
      } else {
        AppUtils.showToast(res.data?.message || 'Login failed')
      }
    } catch {
      AppUtils.showToast('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getFirebaseToken();
  }, []);

  const getFirebaseToken = async () => {
    try {
      // iOS requires explicit permission; Android grants it by default
      const authStatus = await requestPermission(getMessaging())
      const isGranted =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL

      if (isGranted) {
        const fcmToken = await getToken(getMessaging())
        if (fcmToken) {
          await SessionManager.setFCMToken(fcmToken)
        }
      }
    } catch (fcmError) {
      // Non-fatal — don't block login if push permission is denied
      console.warn('FCM token error:', fcmError)
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background accent glow */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* Top red stripe */}
      <View style={styles.topStripe} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>

          {/* ── Brand mark ───────────────────────────────────── */}
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoMark}>S</Text>
            </View>
            <View>
              <Text style={styles.appName}>SalesApp</Text>
              <Text style={styles.appTagline}>Business Intelligence</Text>
            </View>
          </View>

          {/* ── Card ─────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* ── Heading ──────────────────────────────────────── */}
            <View style={styles.headingBlock}>
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.subheading}>Sign in to your account to continue</Text>
            </View>

            {/* ── Divider ──────────────────────────────────────── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>CREDENTIALS</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ── Form ─────────────────────────────────────────── */}
            <ThemedInput
              label="Email address"
              value={username}
              onChangeText={setUsername}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!isLoading}
            />

            <View style={{ height: 12 }} />

            <ThemedInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              textContentType="password"
              editable={!isLoading}
              onSubmitEditing={handleLogin}
              rightIcon={
                <TextInput.Icon
                  icon={secureText ? 'eye-off' : 'eye'}
                  color={T.textSecondary}
                  onPress={() => setSecureText(!secureText)}
                />
              }
            />

            {/* ── Forgot password ──────────────────────────────── */}
            <Pressable
              style={styles.forgotRow}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {/* ── Submit ───────────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                isLoading && styles.submitBtnDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitText}>Signing in…</Text>
              ) : (
                <Text style={styles.submitText}>Sign In →</Text>
              )}
            </Pressable>

          </View>

          {/* ── Footer ───────────────────────────────────────── */}
          <Text style={styles.footer}>
            Secure · Encrypted · Private
          </Text>

        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Top stripe
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: T.accent,
  },

  // Background glows
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: T.accentGlow,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(226,16,31,0.04)',
  },

  keyboardView: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 32,
  },
  logoBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  logoMark: {
    fontSize: 22,
    fontWeight: '800',
    color: T.white,
    letterSpacing: -0.5,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.3,
    fontFamily: Fonts.medium,
  },
  appTagline: {
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // Card
  card: {
    backgroundColor: T.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: T.border,
  },

  // Heading
  headingBlock: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.7,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 20,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: T.border,
  },
  dividerText: {
    fontSize: 10,
    color: T.textMuted,
    letterSpacing: 1.5,
  },

  // Input
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputInner: {
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  inputContent: {
    fontSize: 15,
    fontWeight: '500',
    paddingTop: 8,
  },

  // Forgot
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 13,
    color: T.accent,
    fontWeight: '600',
  },

  // Submit button
  submitBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnPressed: {
    backgroundColor: '#B90D18',
    shadowOpacity: 0.15,
  },
  submitBtnDisabled: {
    backgroundColor: T.accentDim,
    shadowOpacity: 0.08,
  },
  submitText: {
    color: T.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 1,
  },
})