import { database } from '@/Database'
import SalesRegisterEntry from '@/Database/models/SalesRegisterEntry'
import { ApiEndPoints } from '@/network/ApiEndPoint'
import { SessionManager } from '@/utils/sessionManager'
import { Collection, Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

// ─── Public Types ─────────────────────────────────────────────────────────────

export type BtwnDays = 'd0_7' | 'd7_15' | 'd15_30' | 'over_30'
export type Section = 'due' | 'upcoming'
export type BtwnDaysFilter = BtwnDays | 'all'

export const ALL_BTWN_DAYS: BtwnDays[] = ['d0_7', 'd7_15', 'd15_30', 'over_30']

// ─── API Types ────────────────────────────────────────────────────────────────

interface PartyItem {
    party_name: string
    party_id: string
    gstin_uin: string
    gross_total: string
    amount_received: string
    outstanding: string
    payment_status: string
    status_display: string
    nearest_due_date?: string
}

interface SectionPayload {
    totalRecords: string
    total_invoices: string
    total_parties: string
    total_gross: string
    total_outstanding: string
    page: string
    limit: string
    data: PartyItem[]
}

export interface SalesRegisterApiResponse {
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

function getCollection(): Collection<SalesRegisterEntry> | null {
    try {
        return database.get<SalesRegisterEntry>('sales_register_entries')
    } catch (e) {
        console.error('[salesRegisterSync] collection not found:', e)
        return null
    }
}

function buildInsertBatch(
    col: Collection<SalesRegisterEntry>,
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
            record.amountReceived = item.amount_received
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
        `${ApiEndPoints.BASE_URL}dashboard/sales-register-list?btwn_days=${btwnDays}`,
        { method: 'GET', headers: await authHeaders() },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: SalesRegisterApiResponse = await res.json()
    if (!json.success) throw new Error(json.message ?? 'API error')
    const col = getCollection()
    if (!col) throw new Error('sales_register_entries collection is null')

    await database.write(async () => {
        // Delete stale rows for this bucket (both sections)
        const existing = await col.query(Q.where('btwn_days', btwnDays)).fetch()
        const deleteBatch = existing.map((r) => r.prepareDestroyPermanently())

        const dueItems = json.due.data || []
        const upcomingItems = json.upcoming.data || []

        const insertBatch = [
            ...buildInsertBatch(col, dueItems, 'due', btwnDays),
            ...buildInsertBatch(col, upcomingItems, 'upcoming', btwnDays),
        ]

        await database.batch(...deleteBatch, ...insertBatch)
    })
}

// ─── Public: sync all buckets ─────────────────────────────────────────────────

export async function syncAllSalesRegister(): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('[salesRegisterSync] Offline — serving cached data')
        return
    }
    try {
        for (const b of ALL_BTWN_DAYS) {
            await syncBucket(b)
        }
    } catch (err) {
        console.warn('[salesRegisterSync] Sync failed, using cached:', err)
    }
}

// ─── Public: load from local DB ───────────────────────────────────────────────

export async function loadAllSalesRegister(): Promise<SalesRegisterEntry[]> {
    const col = getCollection()
    if (!col) return []
    return col.query(Q.sortBy('party_name', Q.asc)).fetch()
}