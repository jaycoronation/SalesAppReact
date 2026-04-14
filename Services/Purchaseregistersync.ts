import { database } from '@/Database'
import PurchaseRegisterEntry from '@/Database/models/Purchaseregisterentry'
import { ApiEndPoints } from '@/network/ApiEndPoint'
import { SessionManager } from '@/utils/sessionManager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Collection, Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

// ─── Public Types ─────────────────────────────────────────────────────────────

/** All four date-range buckets the API accepts — mirrors the aging bucket keys */
export type BtwnDays = 'd0_7' | 'd7_15' | 'd15_30' | 'over_30'

/** Which envelope a row belongs to */
export type Section = 'due' | 'upcoming'

/** 'all' is a local-only virtual filter — loads every row for a section */
export type BtwnDaysFilter = BtwnDays | 'all'

export const ALL_BTWN_DAYS: BtwnDays[] = ['d0_7', 'd7_15', 'd15_30', 'over_30']

// ─── API Types ────────────────────────────────────────────────────────────────

interface PartyItem {
    party_name: string
    party_id: number
    gstin_uin: string
    gross_total: number
    amount_paid_out: number
    outstanding: number
    payment_status: string
    status_display: string
    nearest_due_date?: string
}

interface SectionPayload {
    totalRecords: number
    total_invoices: number
    total_parties: number
    total_gross: number
    total_outstanding: number
    page: number
    limit: number
    data: PartyItem[]
}

export interface PurchaseRegisterApiResponse {
    success: number
    message: string
    due: SectionPayload
    upcoming: SectionPayload
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

function getCollection(): Collection<PurchaseRegisterEntry> | null {
    try {
        return database.get<PurchaseRegisterEntry>('purchase_register_entries')
    } catch (e) {
        console.error('[purchaseRegisterSync] collection not found:', e)
        return null
    }
}

// ─── Invoice counts stored in AsyncStorage ───────────────────────────────────

const INVOICE_COUNTS_KEY = 'purchase_register_invoice_counts'

export type InvoiceCounts = Record<Section, Record<BtwnDays | 'all', number>>

const EMPTY_INVOICE_COUNTS: InvoiceCounts = {
    due: { d0_7: 0, d7_15: 0, d15_30: 0, over_30: 0, all: 0 },
    upcoming: { d0_7: 0, d7_15: 0, d15_30: 0, over_30: 0, all: 0 },
}

async function updateInvoiceCounts(
    btwnDays: BtwnDays,
    dueCount: number,
    upcomingCount: number,
): Promise<void> {
    try {
        const stored = await AsyncStorage.getItem(INVOICE_COUNTS_KEY)
        const counts: InvoiceCounts = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(EMPTY_INVOICE_COUNTS))
        counts.due[btwnDays] = dueCount
        counts.upcoming[btwnDays] = upcomingCount
        // Recompute 'all' totals
        counts.due.all = ALL_BTWN_DAYS.reduce((s, k) => s + (counts.due[k] ?? 0), 0)
        counts.upcoming.all = ALL_BTWN_DAYS.reduce((s, k) => s + (counts.upcoming[k] ?? 0), 0)
        await AsyncStorage.setItem(INVOICE_COUNTS_KEY, JSON.stringify(counts))
    } catch (e) {
        console.warn('[purchaseRegisterSync] failed to save invoice counts:', e)
    }
}

export async function loadPurchaseInvoiceCounts(): Promise<InvoiceCounts> {
    try {
        const stored = await AsyncStorage.getItem(INVOICE_COUNTS_KEY)
        return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(EMPTY_INVOICE_COUNTS))
    } catch {
        return JSON.parse(JSON.stringify(EMPTY_INVOICE_COUNTS))
    }
}

function buildInsertBatch(
    col: Collection<PurchaseRegisterEntry>,
    items: PartyItem[],
    section: Section,
    btwnDays: BtwnDays,
) {
    return items.map((item) =>
        col.prepareCreate((record) => {
            record.partyId = String(item.party_id)
            record.partyName = item.party_name
            record.gstinUin = item.gstin_uin
            record.grossTotal = item.gross_total
            record.amountPaidOut = item.amount_paid_out
            record.outstanding = item.outstanding
            record.paymentStatus = item.payment_status
            record.statusDisplay = item.status_display
            record.section = section
            record.btwnDays = btwnDays
            record.nearestDueDate = item.nearest_due_date ?? ''
        }),
    )
}

// ─── Sync a single btwn_days bucket ──────────────────────────────────────────

async function syncBucket(btwnDays: BtwnDays): Promise<void> {
    const res = await fetch(
        `${ApiEndPoints.BASE_URL}dashboard/purchase-register-list?btwn_days=${btwnDays}`,
        { method: 'GET', headers: await authHeaders() },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: PurchaseRegisterApiResponse = await res.json()
    if (!json.success) throw new Error(json.message ?? 'API error')

    const col = getCollection()
    if (!col) throw new Error('purchase_register_entries collection is null')

    // Save invoice counts from this bucket response
    await updateInvoiceCounts(
        btwnDays,
        parseInt(String(json.due.total_invoices ?? '0')) || 0,
        parseInt(String(json.upcoming.total_invoices ?? '0')) || 0,
    )

    await database.write(async () => {
        const existing = await col.query(Q.where('btwn_days', btwnDays)).fetch()
        const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

        const dueItems = json.due.data || []
        const upcomingItems = json.upcoming.data || []

        const insertBatch = [
            ...buildInsertBatch(col, dueItems, 'due', btwnDays),
            ...buildInsertBatch(col, upcomingItems, 'upcoming', btwnDays),
        ]

        if (insertBatch.length === 0) {
            console.log('⚠️ No data to insert for', btwnDays)
        }

        await database.batch([...deleteBatch, ...insertBatch])
    })
}

// ─── Public: sync all buckets ─────────────────────────────────────────────────

/**
 * Fetches all four btwn_days buckets in parallel and persists them.
 * Call on screen mount and pull-to-refresh.
 */
export async function syncAllPurchaseRegister(): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('[purchaseRegisterSync] Offline — serving cached data')
        return
    }
    try {
        // await Promise.all(ALL_BTWN_DAYS.map((b) => syncBucket(b)))
        for (const b of ALL_BTWN_DAYS) {
            console.log('🔄 Syncing:', b)
            await syncBucket(b)
        }

        const all = await database.get('purchase_register_entries').query().fetch()
        console.log('📊 FINAL DB COUNT:', all.length)
    } catch (err) {
        console.warn('[purchaseRegisterSync] Sync failed, using cached:', err)
    }
}

// ─── Public: load from local DB ───────────────────────────────────────────────

/**
 * Returns every row from the local DB (all sections, all buckets).
 * The screen computes per-chip summaries from this single in-memory pass.
 */
export async function loadAllPurchaseRegister(): Promise<PurchaseRegisterEntry[]> {
    const col = getCollection()
    if (!col) return []
    return col.query(Q.sortBy('nearest_due_date', Q.asc)).fetch()
}