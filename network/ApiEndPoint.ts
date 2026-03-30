const BASE_URL = "https://sps-velocity.onrender.com/api/";
// const BASE_URL = "http://192.168.29.245:5000/api/";

export const ApiEndPoints = {
  BASE_URL,
  LOGIN: `${BASE_URL}auth/login`,
  DASHBOARD_OVERVIEW: `${BASE_URL}register/dashboard_overview`,
  DASHBOARD_MONTHLY_TREND: `${BASE_URL}register/dashboard_monthly-trend`,
  DASHBOARD_TOP_CUSTOMER_VENDOR: `${BASE_URL}register/dashboard_top-parties`,
  DASHBOARD_INVOICES_LIST: `${BASE_URL}dashboard/recent-invoices`,
  USER_PROFILE: `${BASE_URL}users/profile`,
  UPDATE_PROFILE: `${BASE_URL}users/save`,
  GET_COUNTRIES: `${BASE_URL}admin/country`,
  GET_STATES: `${BASE_URL}admin/states`,
  GET_CITIES: `${BASE_URL}admin/cities`,
  FORGOT_PASSWORD: `${BASE_URL}auth/forgot-password`,
  VERIFY_OTP: `${BASE_URL}auth/verify-otp`,
  PASSWORD_RESET: `${BASE_URL}auth/password-reset`,
};