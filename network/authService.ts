import { ApiEndPoints } from "@/network/ApiEndPoint";
import { apiGet, apiPost, apiPostMultipart } from "../utils/apiService";

// 🔐 Login API
export const loginAPI = async (email: string, password: string, device_token: string, model_name: string, device_type: string) => {
  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("password", password);
  formData.append("device_token", device_token);
  formData.append("device_name", model_name);
  formData.append("device_type", device_type);
  console.log("Url", ApiEndPoints.LOGIN);

  console.log("device_type", device_type);
  console.log("device_name", model_name);
  return apiPost(ApiEndPoints.LOGIN, formData, true);
};

export const dashboardOverviewAPI = async (
  month: number,
  year: number
) => {
  const url = `${ApiEndPoints.DASHBOARD_OVERVIEW}?month=${month}&year=${year}`;
  return apiGet(url);
};


export const dashboardMonthlyTrendAPI = async (
  fiscal_year: string,
) => {
  const url = `${ApiEndPoints.DASHBOARD_MONTHLY_TREND}?fiscal_year=${fiscal_year}`;
  return apiGet(url);
};



//VENDOR AND CUSTOMER API

export const dashboardTopPartiesAPI = async (
  month: number,
  year: number
) => {
  const url = `${ApiEndPoints.DASHBOARD_TOP_CUSTOMER_VENDOR}?month=${month}&year=${year}`;
  return apiGet(url);
};




export const recentInvoicesAPI = async (month: number,
  year: number) => {
  return apiGet(`${ApiEndPoints.DASHBOARD_INVOICES_LIST}?month=${month}&year=${year}`);
};

export const userProfileAPI = async (user_id: string) => {
  return apiGet(`${ApiEndPoints.USER_PROFILE}?user_id=${user_id}`);
};

export const updateProfileAPI = async (formData: any) => {
  return apiPostMultipart(ApiEndPoints.UPDATE_PROFILE, formData);
};

export const fetchCountriesAPI = async () => {
  return apiGet(ApiEndPoints.GET_COUNTRIES);
};

export const fetchStatesAPI = async (country_id: string) => {
  return apiGet(`${ApiEndPoints.GET_STATES}?country_id=${country_id}`);
};

export const fetchCitiesAPI = async (state_id: string) => {
  return apiGet(`${ApiEndPoints.GET_CITIES}?state_id=${state_id}`);
};

export const forgotPasswordAPI = async (email: string) => {
  const formData = new URLSearchParams();
  formData.append("email", email);
  return apiPost(ApiEndPoints.FORGOT_PASSWORD, formData, true);
};

export const verifyOtpAPI = async (email: string, otp: string) => {
  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("otp", otp);
  return apiPost(ApiEndPoints.VERIFY_OTP, formData, true);
};

export const passwordResetAPI = async (email: string, new_password: string) => {
  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("new_password", new_password);
  return apiPost(ApiEndPoints.PASSWORD_RESET, formData, true);
};
