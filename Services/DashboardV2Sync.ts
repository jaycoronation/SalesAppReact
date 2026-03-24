import { database } from '@/Database'
import DashboardOverviewV2 from '@/Database/models/dashboardoverview'
import UpcomingPayment from '@/Database/models/Upcomingpayment'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'


// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function safeNum(val: any): number {
    const n = typeof val === 'number' ? val : parseFloat(val)
    return isNaN(n) ? 0 : n
}

// ─── Sync dashboard overview ──────────────────────────────────────────────────

export async function syncDashboardV2(month: number, year: number): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached dashboard v2 data')
        return
    }

    try {
        const res = await fetch(
            `${ApiEndPoints.BASE_URL}dashboard/overview?month=${month}&year=${year}`,
            { method: 'GET', headers: await authHeaders() },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        if (!json.success) throw new Error(json.message)

        const d = json.data
        const collection = database.get<DashboardOverviewV2>('dashboard_overview_v2')

        await database.write(async () => {
            const existing = await collection
                .query(Q.where('month', month), Q.where('year', year))
                .fetch()

            const apply = (record: DashboardOverviewV2) => {
                record.month = month
                record.year = year
                record.kpiJson = JSON.stringify(d.kpi ?? {})
                record.netPositionJson = JSON.stringify(d.net_position ?? {})
                record.receivablesAgingJson = JSON.stringify(d.receivables_aging ?? {})
                record.payablesAgingJson = JSON.stringify(d.payables_aging ?? {})
                record.upcomingPaymentsJson = JSON.stringify(d.upcoming_payments ?? {})
                record.recentInvoicesJson = JSON.stringify(d.recent_invoices ?? [])
            }

            if (existing.length > 0) {
                await existing[0].update(apply)
            } else {
                await collection.create(apply)
            }
        })

        console.log(`Dashboard v2 sync complete — ${month}/${year}`)
    } catch (err) {
        console.warn('Dashboard v2 sync failed, using cached data:', err)
    }
}

// ─── Sync upcoming payments (separate API) ────────────────────────────────────

export async function syncUpcomingPayments(
    fiscalYear: string,
    type: 'upcoming' | 'overdue' = 'upcoming',
): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached upcoming payments')
        return
    }

    try {
        const res = await fetch(
            `${ApiEndPoints.BASE_URL}dashboard/upcoming-payments?days=30&fiscal_year=${fiscalYear}&page=1&limit=50&type=${type}`,
            { method: 'GET', headers: await authHeaders() },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        if (!json.success) throw new Error(json.message)

        const collection = database.get<UpcomingPayment>('upcoming_payments')

        await database.write(async () => {
            // Delete existing for this fiscal year + type
            const existing = await collection
                .query(
                    Q.where('fiscal_year', fiscalYear),
                    Q.where('sync_type', type),
                )
                .fetch()
            const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

            const insertBatch = (json.data ?? []).map((item: any) =>
                collection.prepareCreate((record: UpcomingPayment) => {
                    record.purchaseId = String(item.purchase_id)
                    record.partyId = String(item.party_id)
                    record.partyName = item.party_name ?? ''
                    record.gstinUin = item.gstin_uin ?? ''
                    record.voucherNo = item.voucher_no ?? ''
                    record.txnDate = item.txn_date ?? ''
                    record.dueDate = item.due_date ?? ''
                    record.outstanding = safeNum(item.outstanding)
                    record.paymentStatus = item.payment_status ?? ''
                    record.isOverdue = safeNum(item.is_overdue)
                    record.daysOverdue = safeNum(item.days_overdue)
                    record.daysUntil = safeNum(item.days_until)
                    record.urgency = item.urgency ?? ''
                    record.fiscalYear = fiscalYear
                    record.syncType = type
                }),
            )

            await database.batch(...deleteBatch, ...insertBatch)
        })

        console.log(`Upcoming payments sync (${type}) complete — ${json.data?.length ?? 0} records`)
    } catch (err) {
        console.warn(`Upcoming payments sync (${type}) failed, using cached data:`, err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

export async function loadDashboardV2(
    month: number,
    year: number,
): Promise<DashboardOverviewV2 | null> {
    const records = await database
        .get<DashboardOverviewV2>('dashboard_overview_v2')
        .query(Q.where('month', month), Q.where('year', year))
        .fetch()
    return records.length > 0 ? records[0] : null
}

export async function loadUpcomingPayments(
    fiscalYear: string,
    type: 'upcoming' | 'overdue',
): Promise<UpcomingPayment[]> {
    return database
        .get<UpcomingPayment>('upcoming_payments')
        .query(
            Q.where('fiscal_year', fiscalYear),
            Q.where('sync_type', type),
            Q.sortBy('due_date', Q.asc),
        )
        .fetch()
}