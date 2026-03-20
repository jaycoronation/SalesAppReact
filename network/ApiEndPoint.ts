const BASE_URL = "http://192.168.29.245:5000/api/";

export const ApiEndPoints = {
  BASE_URL,
  LOGIN: `${BASE_URL}auth/login`, 
  DASHBOARD_OVERVIEW: `${BASE_URL}register/dashboard_overview`,
  DASHBOARD_MONTHLY_TREND: `${BASE_URL}register/dashboard_monthly-trend`,
   DASHBOARD_TOP_CUSTOMER_VENDOR: `${BASE_URL}register/dashboard_top-parties`,
};