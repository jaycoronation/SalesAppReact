import { database } from '@/Database'
import PaymentEntry from '@/Database/models/PaymentEntry'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'


// ─── API Types ────────────────────────────────────────────────────────────────

export interface PaymentApiItem {
    payment_id: string
    group_id: string
    party_id: string
    party_name: string
    party_gstin: string
    txn_date: string
    particulars: string
    vch_type: string
    vch_no: string
    debit_amount: string
    credit_amount: string
    bank_account: string
    payment_mode: string
    fiscal_year: string
    created_at: string
}

export interface PaymentApiResponse {
    success: number
    message: string
    month: number
    year: number
    totalRecords: number
    page: number
    limit: number
    data: PaymentApiItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

function safeNum(val: string): number {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
}

function applyPaymentFields(
    record: PaymentEntry,
    item: PaymentApiItem,
    month: number,
    year: number,
    page: number,
): void {
    record.paymentId = item.payment_id
    record.groupId = item.group_id
    record.partyId = item.party_id
    record.partyName = item.party_name
    record.partyGstin = item.party_gstin
    record.month = month
    record.year = year
    record.fiscalYear = item.fiscal_year
    record.txnDate = item.txn_date
    record.particulars = item.particulars
    record.vchType = item.vch_type
    record.vchNo = item.vch_no
    record.debitAmount = safeNum(item.debit_amount)
    record.creditAmount = safeNum(item.credit_amount)
    record.bankAccount = item.bank_account
    record.paymentMode = item.payment_mode
    record.page = page
}

// ─── Collection guard ─────────────────────────────────────────────────────────

function getPaymentCollection() {
    try {
        return database.get<PaymentEntry>('payment_entries')
    } catch (e) {
        console.error(
            '[paymentSync] "payment_entries" collection not found.\n' +
            'Fix: add PaymentEntry to modelClasses in @/Database/index.ts\n' +
            'and bump schema version to 5.',
            e,
        )
        return null
    }
}

// ─── Sync a single page ───────────────────────────────────────────────────────

async function syncPaymentPage(
    month: number,
    year: number,
    page: number,
): Promise<{ totalRecords: number }> {
    const res = await fetch(
        `${ApiEndPoints.BASE_URL}register/payment_list?month=${month}&year=${year}&page=${page}&limit=10`,
        { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: PaymentApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const collection = getPaymentCollection()
    if (!collection) throw new Error('"payment_entries" collection is null — see console for fix')

    await database.write(async () => {
        const existing = await collection
            .query(
                Q.where('month', month),
                Q.where('year', year),
                Q.where('page', page),
            )
            .fetch()

        const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())
        const insertBatch = json.data.map((item) =>
            collection.prepareCreate((record) =>
                applyPaymentFields(record, item, month, year, page),
            ),
        )

        await database.batch([...deleteBatch, ...insertBatch])
    })

    return { totalRecords: json.totalRecords }
}

// ─── Sync all pages ───────────────────────────────────────────────────────────

export async function syncPayments(month: number, year: number): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached payment data')
        return
    }

    try {
        const { totalRecords } = await syncPaymentPage(month, year, 1)
        const totalPages = Math.ceil(totalRecords / 10)

        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
        for (let i = 0; i < remaining.length; i += 5) {
            await Promise.all(
                remaining.slice(i, i + 5).map((p) => syncPaymentPage(month, year, p)),
            )
        }

        console.log(`Payment sync complete — ${totalRecords} records, ${totalPages} pages`)
    } catch (err) {
        console.warn('Payment sync failed, using cached data:', err)
    }
}