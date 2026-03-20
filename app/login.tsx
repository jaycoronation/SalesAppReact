import { loginAPI } from "@/network/authService";
import { AppUtils, isValidEmail } from "@/utils/AppUtils";
import CustomButton from "@/utils/CommonWidget";
import { Fonts } from "@/utils/fonts";
import { SessionManager } from "@/utils/sessionManager";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  View
} from "react-native";
import { TextInput } from "react-native-paper";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const router = useRouter();

  const handleLogin = () => {
    if (!username) {
       ToastAndroid.show('Please enter email', ToastAndroid.SHORT);
      return;
    }
    else if (!isValidEmail(username)) {
      ToastAndroid.show('Please enter a valid email', ToastAndroid.SHORT);
      return;
    }
    else if (!password) {
       ToastAndroid.show('Please enter password', ToastAndroid.SHORT);
      return;
    }
    else
    {
      callAPI();
    }
    
  };

const callAPI = async () => {
  try {
    setIsLoading(true);

    const res = await loginAPI(username, password);

    if (res.success && res.data.success === 1) {
      await SessionManager.setSession(res.data);
      router.push("/dashboard");
    } else {
      AppUtils.showToast(res.data?.message || "Login failed");
    }

  } catch (error) {
    AppUtils.showToast("Something went wrong");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Section */}
             <View style={styles.logoContainer}>
                <Text style={styles.title}>Enter your detail to login</Text>
             </View>


          {/* Login Form */}
           <TextInput
                  style={styles.input}
                  contentStyle={{ fontSize: 16,fontWeight: "600" }}
                  label="Email"
                  mode="outlined"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!isLoading}
                  outlineStyle={{
                    borderRadius: 12,
                  }}
                />

           <TextInput
                  style={styles.input}
                  label="Password"
                 mode="outlined" 
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText} 
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  onSubmitEditing={handleLogin}
                  contentStyle={{ fontSize: 16,fontWeight: "600" }}
                  outlineStyle={{
                  borderRadius: 12,
                }}
                 right={
                  <TextInput.Icon
                    icon={secureText ? "eye-off" : "eye"}
                    onPress={() => setSecureText(!secureText)}
                  />
                }
                />

           <CustomButton
               style={{ marginTop: 22 }}
              title="Submit"
              onPress={handleLogin}
              loading={isLoading}
            />
          {/* Footer */}
          
        </View>
      </KeyboardAvoidingView>
    </View>
  );

}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "flex-start",
    marginBottom: 22,
    marginTop: 42,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#2C2C2C",
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.medium,
    color: "#000000",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2C2C2C",
  },
  input: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "600",
    borderRadius: 12,
    
  },
  loginButton: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginTop: 22,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: "#2C2C2C",
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});