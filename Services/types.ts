export interface DashboardApiSales {
  total_invoices: number
  total_sales: string
  igst_collected: string
  cgst_collected: string
  sgst_collected: string
}

export interface DashboardApiPurchase {
  total_bills: number
  total_purchase: string
  igst_paid: string
  cgst_paid: string
  sgst_paid: string
}

export interface DashboardApiPayment {
  total_vouchers: number
  total_paid: string
}

export interface DashboardApiJournal {
  total_tds_payable: string
  total_pf: string
}

export interface DashboardApiProfitLoss {
  gross_sales: string
  gross_purchase: string
  net: string
  is_profit: string
}

export interface DashboardApiGstReconcile {
  gst_collected: string
  gst_paid: string
  net_gst_liability: string
  is_payable: string
}

export interface DashboardApiData {
  month: number
  year: number
  sales: DashboardApiSales
  purchase: DashboardApiPurchase
  payment: DashboardApiPayment
  journal: DashboardApiJournal
  profit_loss: DashboardApiProfitLoss
  gst_reconcile: DashboardApiGstReconcile
}

export interface DashboardApiResponse {
  success: number
  message: string
  data: DashboardApiData
}

// ─── Dashboard Overview ───────────────────────────────────────────────────────

export interface DashboardApiData {
  month: number
  year: number
  sales: {
    total_invoices: number
    total_sales: string
    igst_collected: string
    cgst_collected: string
    sgst_collected: string
  }
  purchase: {
    total_bills: number
    total_purchase: string
    igst_paid: string
    cgst_paid: string
    sgst_paid: string
  }
  payment: {
    total_vouchers: number
    total_paid: string
  }
  journal: {
    total_tds_payable: string
    total_pf: string
  }
  profit_loss: {
    gross_sales: string
    gross_purchase: string
    net: string
    is_profit: string
  }
  gst_reconcile: {
    gst_collected: string
    gst_paid: string
    net_gst_liability: string
    is_payable: string
  }
}

// ─── Top Parties ──────────────────────────────────────────────────────────────

export interface TopPartiesApiResponse {
  success: number
  message: string
  data: {
    month: number
    year: number
    top_customers: {
      party_name: string
      gstin_uin: string
      total_sales: string
      total_invoices: number
    }[]
    top_vendors: {
      party_name: string
      gstin_uin: string
      total_purchase: string
      total_bills: number
    }[]
  }
}

// ─── Monthly Trends ───────────────────────────────────────────────────────────

export interface MonthlyTrendApiResponse {
  success: number
  message: string
  data: {
    fiscal_year: string
    sales: {
      month: string
      total_sales: string
      total_invoices: number
    }[]
    purchase: {
      month: string
      total_purchase: string
      total_bills: number
    }[]
  }
}
