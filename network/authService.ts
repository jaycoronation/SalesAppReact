import { ApiEndPoints } from "@/network/ApiEndPoint";
import { apiGet, apiPost } from "../utils/apiService";

// 🔐 Login API
export const loginAPI = async (email: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("password", password);

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




