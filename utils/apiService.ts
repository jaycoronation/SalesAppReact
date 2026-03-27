import { SessionManager } from "./sessionManager";

// ✅ GET API
export const apiGet = async (url: string) => {
  try {
    const token = await SessionManager.getToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const data = await response.json();

    return {
      success: response.ok,
      data,
      status: response.status,
    };
  } catch (error) {
    return { success: false, data: null };
  }
};

// ✅ POST API
export const apiPost = async (
  url: string,
  body: any,
  isFormData: boolean = false
) => {
  try {
    const token = await SessionManager.getToken();

    const headers: any = {
      ...(isFormData
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: isFormData ? body.toString() : JSON.stringify(body),
    });

    const data = await response.json();

    return {
      success: response.ok,
      data,
      status: response.status,
    };
  } catch (error) {
    console.log("POST API Error:", error);
    return { success: false, data: null };
  }
};