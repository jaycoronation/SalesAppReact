import { database } from '@/Database';
import PurchaseRegisterEntry from '@/Database/models/Purchaseregisterentry';
import { ApiEndPoints } from "@/network/ApiEndPoint";
import { SessionManager } from '@/utils/sessionManager';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';

export type BtwnDays = 'paid' | 'd0_7' | 'd7_15' | 'd15_30' | 'over_30'

// ─── API Types ────────────────────────────────────────────────────────────────

export interface PurchaseRegisterApiResponse {
    success: number
    message: string
    totalRecords: number
    total_parties: number
    total_gross: number
    total_outstanding: number
    page: number
    limit: number
    data: {
        purchase_id: string
        voucher_no: string
        txn_date: string
        due_date: string
        party_name: string
        party_id: string
        gstin_uin: string
        gross_total: string
        amount_paid_out: string
        outstanding: string
        payment_status: string
        status_display: string
        is_overdue: string
        days_overdue: string
        days_until: string
    }[]
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

function getCollection() {
    try {
        return database.get<PurchaseRegisterEntry>('purchase_register_entries')
    } catch (e) {
        console.error('[purchaseRegisterSync] collection not found — add PurchaseRegisterEntry to modelClasses and bump schema to 11', e)
        return null
    }
}

// ─── Sync a single page for a bucket ─────────────────────────────────────────

async function syncPage(
    btwnDays: BtwnDays,
): Promise<{ totalRecords: number }> {
    const res = await fetch(
        `${ApiEndPoints.BASE_URL}dashboard/purchase-register-list?btwn_days=${btwnDays}`,
        { method: 'GET', headers: await authHeaders() },
    )

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: PurchaseRegisterApiResponse = await res.json()
    if (!json.success) throw new Error(json.message)

    const collection = getCollection()
    if (!collection) throw new Error('purchase_register_entries collection is null')

    await database.write(async () => {
        const existing = await collection
            .query(Q.where('btwn_days', btwnDays))
            .fetch()

        const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

        const insertBatch = json.data.map((item) =>
            collection.prepareCreate((record) => {
                record.purchaseId = item.purchase_id
                record.partyId = item.party_id
                record.partyName = item.party_name
                record.gstinUin = item.gstin_uin
                record.voucherNo = item.voucher_no
                record.txnDate = item.txn_date
                record.dueDate = item.due_date
                record.grossTotal = safeNum(item.gross_total)
                record.amountPaidOut = safeNum(item.amount_paid_out)
                record.outstanding = safeNum(item.outstanding)
                record.paymentStatus = item.payment_status
                record.statusDisplay = item.status_display
                record.isOverdue = item.is_overdue
                record.daysOverdue = item.days_overdue
                record.daysUntil = item.days_until
                record.btwnDays = btwnDays
            }),
        )

        await database.batch(...deleteBatch, ...insertBatch)
    })

    return { totalRecords: json.totalRecords }
}

// ─── Sync all pages for a bucket ─────────────────────────────────────────────

export async function syncPurchaseRegister(
    btwnDays: BtwnDays,
    fiscalYear: string,
): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached purchase register data')
        return
    }

    try {
        const { totalRecords } = await syncPage(btwnDays,)
        const totalPages = Math.ceil(totalRecords / 20)

        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
        for (let i = 0; i < remaining.length; i += 5) {
            await Promise.all(
                remaining.slice(i, i + 5).map((p) => syncPage(btwnDays,)),
            )
        }
    } catch (err) {
        console.warn(`Purchase register sync (${btwnDays}) failed, using cached:`, err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

export async function loadPurchaseRegister(
    btwnDays: BtwnDays,
): Promise<PurchaseRegisterEntry[]> {
    const collection = getCollection()
    if (!collection) return []
    return collection
        .query(Q.where('btwn_days', btwnDays), Q.sortBy('due_date', Q.asc))
        .fetch()
}