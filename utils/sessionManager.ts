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

  // ✅ Clear session
  clearSession: async () => {
    await AsyncStorage.multiRemove([
      "token",
      "user_id",
      "name",
      "email",
      "country_code",
      "contact_no",
      "profile_pic",
      "isLogged",
    ]);
  },
};