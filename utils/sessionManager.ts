import { database } from "@/Database";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SessionManager = {
  setSession: async (data: any) => {
    try {
      await AsyncStorage.setItem("isLogged", "true");
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user_id", data.user.user_id.toString());
      await AsyncStorage.setItem("name", data.user.name);
      await AsyncStorage.setItem("email", data.user.email);
      await AsyncStorage.setItem("country_code", data.user.country_code);
      await AsyncStorage.setItem("contact_no", data.user.contact_no);
      await AsyncStorage.setItem("profile_pic", data.user.profile_pic || "");
    } catch (e) {
      console.log("Error saving session", e);
    }
  },

  // ✅ Get individual values
  getToken: async () => await AsyncStorage.getItem("token"),
  getName: async () => await AsyncStorage.getItem("name"),
  getEmail: async () => await AsyncStorage.getItem("email"),
  getIsLoggedIn: async () => (await AsyncStorage.getItem("isLogged")) === "true",

  // ✅ Get all data together (optional)
  getUserData: async () => {
    return {
      user_id: await AsyncStorage.getItem("user_id"),
      name: await AsyncStorage.getItem("name"),
      email: await AsyncStorage.getItem("email"),
      country_code: await AsyncStorage.getItem("country_code"),
      contact_no: await AsyncStorage.getItem("contact_no"),
      profile_pic: await AsyncStorage.getItem("profile_pic"),
    };
  },

  setFCMToken: async (token: string): Promise<void> => {
    await AsyncStorage.setItem('fcm_token', token)
  },
  getFCMToken: async () => await AsyncStorage.getItem("fcm_token"),


  // ✅ Clear session
  clearSession: async () => {
    try {
      // Clear all AsyncStorage data (tokens, filters, user info, etc.)
      await AsyncStorage.clear();

      // Clear local database (WatermelonDB)
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });

      console.log("Session and database cleared successfully");
    } catch (e) {
      console.log("Error clearing session and database", e);
    }
  },

  // ✅ Dashboard filter persistence
  setDashFilter: async (month: number, year: number, fy: string) => {
    try {
      await AsyncStorage.setItem("dash_month", month.toString());
      await AsyncStorage.setItem("dash_year", year.toString());
      await AsyncStorage.setItem("dash_fy", fy);
    } catch (e) {
      console.log("Error saving dash filter", e);
    }
  },

  getDashFilter: async () => {
    try {
      const m = await AsyncStorage.getItem("dash_month");
      const y = await AsyncStorage.getItem("dash_year");
      const fy = await AsyncStorage.getItem("dash_fy");
      if (m && y && fy) return { month: parseInt(m), year: parseInt(y), fy };
      return null;
    } catch (e) {
      console.log("Error getting dash filter", e);
      return null;
    }
  },
};