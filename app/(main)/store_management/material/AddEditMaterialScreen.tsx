import { CommonResponseModel } from "@/Database/models/CommonResponseModel";
import { ApiEndPoints } from "@/network/ApiEndPoint";
import { Colors } from "@/utils/colors";
import { SessionManager } from "@/utils/sessionManager";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error";

function Toast({
  message,
  type,
  visible,
}: {
  message: string;
  type: ToastType;
  visible: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.toast,
        type === "success" ? s.toastSuccess : s.toastError,
        { opacity },
      ]}
    >
      <Ionicons
        name={type === "success" ? "checkmark-circle" : "alert-circle"}
        size={18}
        color="#fff"
      />
      <Text style={s.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddEditMaterialScreen() {
  const params = useLocalSearchParams<{ item?: string; dept_id?: string }>();
  const item = params.item ? JSON.parse(params.item) : null;
  const isEdit = !!item?.material_id;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [materialName, setMaterialName] = useState(item?.material_name ?? "");
  const [rate, setRate] = useState(item?.rate ?? "");

  const [nameError, setNameError] = useState("");
  const [rateError, setRateError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Toast state ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    key: number;
  } | null>(null);

  const nameRef = useRef<TextInput>(null);
  const rateRef = useRef<TextInput>(null);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    let valid = true;
    if (!materialName.trim()) {
      setNameError("Material name is required");
      valid = false;
    } else {
      setNameError("");
    }
    if (!rate.trim()) {
      setRateError("Rate is required");
      valid = false;
    } else if (isNaN(parseFloat(rate)) || parseFloat(rate) < 0) {
      setRateError("Enter a valid rate");
      valid = false;
    } else {
      setRateError("");
    }
    return valid;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    Keyboard.dismiss();
    if (!validate()) return;

    setLoading(true);
    try {
      const body: Record<string, string> = {
        material_name: materialName.trim(),
        rate: parseFloat(rate).toFixed(2),
      };
      if (item?.dept_id ?? params.dept_id)
        body.dept_id = item?.dept_id ?? params.dept_id!;
      // Only include material_id in edit mode
      if (isEdit) body.material_id = item.material_id;

      const token = await SessionManager.getToken();

      const res = await fetch(ApiEndPoints.ADD_MATERIAL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json: CommonResponseModel = await res.json();

      console.log("Add Material Response:", json);

      if (json.success === 1) {
        showToast(`${json.message}`, "success");
        // Small delay so user sees the success toast, then go back
        router.back();
        // setTimeout(() => {
        //   router.back();
        // }, 1200);
      } else {
        showToast(json.message ?? "Something went wrong", "error");
      }
    } catch (e) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: ToastType) {
    setToast({ message, type, key: Date.now() });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={s.container}>
        <Stack.Screen
          options={{
            title: isEdit ? "Edit Material" : "Add New Material",
            headerShown: true,
            headerBackTitle: "",
            animation: "none",
            headerTintColor: Colors.brandColor,
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.kav}
        >
          <View style={s.card}>
            <View style={s.divider} />

            {/* Material Name */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Material Name</Text>
              <TextInput
                ref={nameRef}
                style={[s.input, nameError ? s.inputError : null]}
                placeholder="Enter material name"
                placeholderTextColor="#9CA3AF"
                value={materialName}
                onChangeText={(t) => {
                  setMaterialName(t);
                  if (nameError) setNameError("");
                }}
                returnKeyType="next"
                onSubmitEditing={() => rateRef.current?.focus()}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {nameError ? <Text style={s.errorText}>{nameError}</Text> : null}
            </View>

            {/* Rate */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Rate</Text>
              <TextInput
                ref={rateRef}
                style={[s.input, rateError ? s.inputError : null]}
                placeholder="Enter rate"
                placeholderTextColor="#9CA3AF"
                value={rate}
                onChangeText={(t) => {
                  setRate(t);
                  if (rateError) setRateError("");
                }}
                keyboardType="decimal-pad"
                returnKeyType="done"
                // onSubmitEditing={handleSubmit}
              />
              {rateError ? <Text style={s.errorText}>{rateError}</Text> : null}
            </View>

            {/* Buttons */}
            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.submitBtn, loading && s.submitBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.submitText}>
                    {isEdit ? "Update Material" : "Add Material"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Toast */}
        {toast && (
          <Toast
            key={toast.key}
            message={toast.message}
            type={toast.type}
            visible
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  kav: {
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    paddingRight: 8,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 20,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  fieldGroup: {
    marginBottom: 18,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FAFAFA",
  },
  inputError: {
    borderColor: Colors.brandColor,
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    fontSize: 12,
    color: Colors.brandColor,
    fontWeight: "500",
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  submitBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.brandColor,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastSuccess: { backgroundColor: "#16A34A" },
  toastError: { backgroundColor: "#DC2626" },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
