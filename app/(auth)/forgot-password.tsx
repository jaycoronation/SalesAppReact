import { forgotPasswordAPI } from '@/network/authService';
import { AppUtils, isValidEmail } from '@/utils/AppUtils';
import { Fonts } from '@/utils/fonts';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg: '#FFFFFF',
  surface: '#F9F9FB',
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
};

// ─── Animated Input ───────────────────────────────────────────────────────────
function ThemedInput({
  label,
  value,
  onChangeText,
  keyboardType,
  editable,
}: any) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [T.border, T.borderFocus],
  });

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [T.surface, T.accentLight],
  });

  return (
    <Animated.View style={[styles.inputWrap, { borderColor, backgroundColor: bgColor }]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable !== false}
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
      />
    </Animated.View>
  );
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!email) {
      AppUtils.showToast('Please enter your email');
      return;
    }
    if (!isValidEmail(email)) {
      AppUtils.showToast('Please enter a valid email');
      return;
    }

    try {
      setIsLoading(true);
      const res = await forgotPasswordAPI(email);
      if (res.success) {
        AppUtils.showToast(res.data.message || 'OTP sent to your email');
        router.push({
          pathname: '/OTPVerificationScreen',
          params: { email }
        });
      } else {
        AppUtils.showToast(res.data?.message || 'Failed to send OTP');
      }
    } catch (error) {
      AppUtils.showToast('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: '', headerShown: true, headerTransparent: true, animation: 'none', headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={T.text} />
          </TouchableOpacity>
        )
      }} />

      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <View style={styles.iconBox}>
              <Ionicons name="mail-open-outline" size={32} color={T.white} />
            </View>
            <Text style={styles.heading}>Forgot Password</Text>
            <Text style={styles.subheading}>
              Enter your email address and we'll send you an OTP to reset your password.
            </Text>
          </View>

          <View style={styles.card}>
            <ThemedInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={!isLoading}
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                isLoading && styles.submitBtnDisabled,
              ]}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitText}>Sending OTP…</Text>
              ) : (
                <Text style={styles.submitText}>Send OTP →</Text>
              )}
            </Pressable>
          </View>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
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
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: T.text,
    letterSpacing: -0.5,
    fontFamily: Fonts.bold,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: T.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: T.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: T.surface,
  },
  inputInner: { backgroundColor: 'transparent', fontSize: 16 },
  inputContent: { fontWeight: '500', paddingTop: 8 },
  submitBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnPressed: { backgroundColor: '#B90D18' },
  submitBtnDisabled: { backgroundColor: T.accentDim },
  submitText: { color: T.white, fontSize: 16, fontWeight: '700' },
  backToLogin: { marginTop: 24, alignSelf: 'center' },
  backToLoginText: { color: T.textMuted, fontSize: 14, fontWeight: '600' },
});

import { TouchableOpacity } from 'react-native';
