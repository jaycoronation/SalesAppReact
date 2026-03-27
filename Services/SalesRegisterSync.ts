// Services/SalesRegisterSync.ts
import { database } from '@/Database'
import SalesRegisterEntry, { BtwnDays } from '@/Database/models/SalesRegisterEntry'
import { ApiEndPoints } from '@/network/ApiEndPoint'
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

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncSalesRegister(
    btwnDays: BtwnDays,
    fiscalYear: string,
): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached sales register data')
        return
    }

    try {
        const res = await fetch(
            `${ApiEndPoints.BASE_URL}dashboard/sales-register-list?btwn_days=${btwnDays}`,
            { method: 'GET', headers: await authHeaders() },
        )

        console.log('URL', `${ApiEndPoints.BASE_URL}dashboard/sales-register-list?btwn_days=${btwnDays}`)
        console.log('res', res)

        // if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        console.log('json data === ', json)
        if (!json.success) throw new Error(json.message)

        console.log('URL', `${ApiEndPoints.BASE_URL}dashboard/sales-register-list?btwn_days=${btwnDays}&fiscal_year=${fiscalYear}`)

        const collection = database.get<SalesRegisterEntry>('sales_register_entries')

        console.log("DATABASE CHECK", collection)

        await database.write(async () => {
            // Delete stale records for this bucket + fiscal year
            const existing = await collection
                .query(
                    Q.where('btwn_days', btwnDays),
                    Q.where('fiscal_year', fiscalYear),
                )
                .fetch()


            console.log('Saved records count:', existing.length);
            console.log('Saved records:', existing);
            const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

            const insertBatch = (json.data ?? []).map((item: any) =>
                collection.prepareCreate((record: SalesRegisterEntry) => {
                    record.btwnDays = btwnDays
                    record.fiscalYear = fiscalYear
                    record.saleId = String(item.sale_id)
                    record.voucherNo = item.voucher_no ?? ''
                    record.txnDate = item.txn_date ?? ''
                    record.dueDate = item.due_date ?? ''
                    record.partyName = item.party_name ?? ''
                    record.partyId = String(item.party_id ?? '')
                    record.gstinUin = item.gstin_uin ?? ''
                    record.grossTotal = safeNum(item.gross_total)
                    record.amountReceived = safeNum(item.amount_received)
                    record.outstanding = safeNum(item.outstanding)
                    record.paymentStatus = item.payment_status ?? ''
                    record.statusDisplay = item.status_display ?? ''
                    record.invoiceType = item.invoice_type ?? ''
                    record.isOverdue = String(item.is_overdue ?? '0')
                    record.daysOverdue = String(item.days_overdue ?? '0')
                    record.daysUntil = String(item.days_until ?? '0')
                }),
            )

            await database.batch(...deleteBatch, ...insertBatch)
        })

    } catch (err) {
        console.warn('Sales register sync failed, using cached data:', err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

export async function loadSalesRegister(
    btwnDays: BtwnDays,
    fiscalYear: string,
): Promise<SalesRegisterEntry[]> {

    if (!database) {
        console.log('DB READY?', database);
        return [];
    }

    return database
        .get<SalesRegisterEntry>('sales_register_entries')
        .query(
            Q.where('btwn_days', btwnDays),
            Q.where('fiscal_year', fiscalYear),
            Q.sortBy('txn_date', Q.desc),
        )
        .fetch()
}