export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 1. Get Current Year (e.g. 2026)
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

// 2. Get Current Month (1–12)
export const getCurrentMonth = (): number => {
  return new Date().getMonth() + 1; // JS month is 0-based
};

// Optional: Get Current Month Name (Mar, Apr...)
export const getCurrentMonthName = (): string => {
  return new Date().toLocaleString("default", { month: "short" });
};

// 3. Get Current Financial Year (India: Apr–Mar)
export const getCurrentFinancialYear = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Financial year starts in April
  if (month >= 4) {
    // Example: Apr 2025 → "2025-26"
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    // Jan–Mar → previous financial year
    const prevYear = year - 1;
    const currentYearShort = year.toString().slice(-2);
    return `${prevYear}-${currentYearShort}`;
  }
};

import { Alert, Platform, ToastAndroid } from "react-native";

export const AppUtils = {

  // =========================
  // ✅ EMPTY CHECK
  // =========================
  isEmpty: (value: string): boolean => {
    return !value || value.trim().length === 0;
  },

  // =========================
  // ✅ MIN LENGTH
  // =========================
  minLength: (value: string, length: number): boolean => {
    return value.length >= length;
  },

  // =========================
  // ✅ DATE FORMAT (DD-MM-YYYY)
  // =========================
  formatDate: (date: string | Date): string => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  },

  // =========================
  // ✅ DATE FORMAT (YYYY-MM-DD)
  // =========================
  formatDateAPI: (date: string | Date): string => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
  },

  // =========================
  // ✅ TIME FORMAT (HH:MM AM/PM)
  // =========================
  formatTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  // =========================
  // ✅ TOAST MESSAGE
  // =========================
  showToast: (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("", message);
    }
  },

  // =========================
  // ✅ ALERT MESSAGE
  // =========================
  showAlert: (title: string, message: string) => {
    Alert.alert(title, message);
  },

  // =========================
  // ✅ CAPITALIZE FIRST LETTER
  // =========================
  capitalize: (text: string): string => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  },

  // =========================
  // ✅ NUMBER FORMAT (1,000)
  // =========================
  formatNumber: (num: number): string => {
    return num.toLocaleString("en-IN");
  },

  // =========================
  // ✅ GENERATE RANDOM ID
  // =========================
  generateId: (): string => {
    return Math.random().toString(36).substring(2, 10);
  },
};