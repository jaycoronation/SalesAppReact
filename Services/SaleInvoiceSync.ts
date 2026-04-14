import { database } from '@/Database'
import SaleInvoiceEntry from '@/Database/models/SaleInvoiceEntry'
import { ApiEndPoints } from '@/network/ApiEndPoint'
import { SessionManager } from '@/utils/sessionManager'
import { Collection, Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceType = 'Sales' | 'Purchase'

export interface SaleInvoiceApiItem {
    id: string                  // API returns "id", not "sale_id"
    voucher_no: string
    txn_date: string            // "DD MMM, YYYY" string (not unix)
    due_date: string            // "DD MMM, YYYY" string (not unix)
    party_name: string
    party_id: string
    gstin_uin: string
    gross_total: string
    amount_settled: string      // API field name (may also appear as amount_received)
    outstanding: string
    payment_status: string
    status_display: string
    invoice_type: string
    is_overdue: string
    days_overdue: string
    days_until: string
}

export interface SaleInvoiceApiResponse {
    success: number
    message: string
    totalRecords: number
    page: number
    limit: number
    data: SaleInvoiceApiItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function getCollection(): Collection<SaleInvoiceEntry> | null {
    try {
        return database.get<SaleInvoiceEntry>('sale_invoice_entries')
    } catch (e) {
        console.error('[saleInvoiceSync] collection not found:', e)
        return null
    }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all invoices for the given month+year+invoiceType in a single request
 * and upserts them. Deletes stale rows for the same month/year/type before inserting.
 */
export async function syncSaleInvoices(
    month: number,
    year: number,
    invoiceType: InvoiceType = 'Sales',
): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('[saleInvoiceSync] Offline — serving cached data')
        return
    }

    try {
        const url =
            `${ApiEndPoints.BASE_URL}dashboard/invoices-list` +
            `?month=${month}&year=${year}&invoice_type=${invoiceType}&page=1&limit=500`

        const res = await fetch(url, { method: 'GET', headers: await authHeaders() })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        console.log('[saleInvoiceSync] url:', res.url)

        const json: SaleInvoiceApiResponse = await res.json()
        if (!json.success) throw new Error(json.message ?? 'API error')
        console.log(`[saleInvoiceSync] fetched ${json.data.length} ${invoiceType} invoices`)

        const col = getCollection()
        if (!col) throw new Error('sale_invoice_entries collection is null')

        await database.write(async () => {
            // ── Delete stale rows for this month/year/type ────────────────────
            // Fall back to unscoped delete if tab_type column doesn't exist yet
            let existing: SaleInvoiceEntry[]
            try {
                existing = await col
                    .query(
                        Q.where('month', String(month)),
                        Q.where('year', String(year)),
                        Q.where('tab_type', invoiceType),
                    )
                    .fetch()
            } catch {
                // tab_type column missing — wipe all rows for month/year instead
                existing = await col
                    .query(Q.where('month', String(month)), Q.where('year', String(year)))
                    .fetch()
            }
            const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

            // ── Insert fresh rows ─────────────────────────────────────────────
            const insertBatch = json.data.map((item) =>
                col.prepareCreate((record) => {
                    record.saleId = String(item.id)               // API uses "id"
                    record.voucherNo = item.voucher_no
                    record.txnDate = item.txn_date                 // "DD MMM, YYYY"
                    record.dueDate = item.due_date
                    record.partyName = item.party_name
                    record.partyId = String(item.party_id)
                    record.gstinUin = item.gstin_uin
                    record.grossTotal = item.gross_total
                    record.amountReceived = item.amount_settled ?? '0'    // API uses amount_settled
                    record.outstanding = item.outstanding
                    record.paymentStatus = item.payment_status
                    record.statusDisplay = item.status_display
                    record.invoiceType = item.invoice_type
                    record.isOverdue = item.is_overdue
                    record.daysOverdue = item.days_overdue
                    record.daysUntil = item.days_until
                    record.month = String(month)
                    record.year = String(year)
                    record.tabType = invoiceType                   // 'Sales' | 'Purchase'
                }),
            )

            await database.batch([...deleteBatch, ...insertBatch])
        })

        console.log(
            `[saleInvoiceSync] Synced ${json.data.length} ${invoiceType} invoices for ${month}/${year}`,
        )
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[saleInvoiceSync] Sync failed (${invoiceType}), using cached:`, msg)
        if (err instanceof Error && err.stack) console.warn(err.stack)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

/**
 * Returns all invoice rows for the given month+year+invoiceType, sorted by due_date asc.
 */
export async function loadSaleInvoices(
    month: number,
    year: number,
    invoiceType: InvoiceType = 'Sales',
): Promise<SaleInvoiceEntry[]> {
    const col = getCollection()
    if (!col) return []
    return col
        .query(
            Q.where('month', String(month)),
            Q.where('year', String(year)),
            Q.where('tab_type', invoiceType),
            Q.sortBy('due_date', Q.asc),
        )
        .fetch()
}