import { Model } from '@nozbe/watermelondb'
import { date, field, readonly } from '@nozbe/watermelondb/decorators'

// ─── Nested types ─────────────────────────────────────────────────────────────

export interface KpiSales {
    total_invoices: string
    total_sales: string
    mom_change_pct: string
    mom_direction: string
    sparkline: number[]
}

export interface KpiPurchases {
    total_bills: string
    total_purchase: string
    mom_change_pct: string
    mom_direction: string
}

export interface KpiGst {
    output_tax: string
    input_tax_credit: string
    net_payable: string
    is_refund: string
}

export interface KpiTds {
    total_entries: string
    total_tds: string
}

export interface NetPosition {
    total_receivable: string
    total_payable: string
    net: string
    overdue_receivable: string
    overdue_payable: string
}

export interface AgingBucket {
    label: string
    amount: string
    count: string
}

export interface AgingData {
    total_outstanding: string
    total_count: string
    buckets: {
        paid: AgingBucket
        d0_7: AgingBucket
        d7_15: AgingBucket
        d15_30: AgingBucket
        over_30: AgingBucket
    }
}

export interface UpcomingPaymentItem {
    purchase_id: string
    voucher_no: string
    txn_date: string
    due_date: string
    party_name: string
    gstin_uin: string
    outstanding: string
    payment_status: string
    is_overdue: string
    days_overdue: string
    days_until: string
    urgency: string   // "overdue" | "critical" | "urgent" | "upcoming"
}

export interface RecentInvoiceItem {
    sale_id: string
    voucher_no: string
    txn_date: string
    due_date: string
    party_name: string
    gstin_uin: string
    gross_total: string
    amount_received: string
    outstanding: string
    payment_status: string
    status_display: string
    invoice_type: string
    is_overdue: string
    days_overdue: string
    days_until: string
}

export default class DashboardOverviewV2 extends Model {
    static table = 'dashboard_overview_v2'

    @field('month') month!: number
    @field('year') year!: number

    // All sections stored as JSON strings
    @field('kpi_json') kpiJson!: string
    @field('net_position_json') netPositionJson!: string
    @field('receivables_aging_json') receivablesAgingJson!: string
    @field('payables_aging_json') payablesAgingJson!: string
    @field('upcoming_payments_json') upcomingPaymentsJson!: string
    @field('recent_invoices_json') recentInvoicesJson!: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    // ── Parsed getters ─────────────────────────────────────────────────────────
    get kpi(): { sales: KpiSales; purchases: KpiPurchases; gst: KpiGst; tds: KpiTds } {
        try { return JSON.parse(this.kpiJson || '{}') } catch { return {} as any }
    }

    get netPosition(): NetPosition {
        try { return JSON.parse(this.netPositionJson || '{}') } catch { return {} as any }
    }

    get receivablesAging(): AgingData {
        try { return JSON.parse(this.receivablesAgingJson || '{}') } catch { return {} as any }
    }

    get payablesAging(): AgingData {
        try { return JSON.parse(this.payablesAgingJson || '{}') } catch { return {} as any }
    }

    get upcomingOverdue(): UpcomingPaymentItem[] {
        try {
            const d = JSON.parse(this.upcomingPaymentsJson || '{}')
            return d.overdue ?? []
        } catch { return [] }
    }

    get upcomingUpcoming(): UpcomingPaymentItem[] {
        try {
            const d = JSON.parse(this.upcomingPaymentsJson || '{}')
            return d.upcoming ?? []
        } catch { return [] }
    }

    get recentInvoices(): RecentInvoiceItem[] {
        try { return JSON.parse(this.recentInvoicesJson || '[]') } catch { return [] }
    }
}