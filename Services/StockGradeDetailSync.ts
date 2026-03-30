import { database } from '@/Database'
import { ApiEndPoints } from '@/network/ApiEndPoint'
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'
import StockGradeDetail from './../Database/models/StockGradeDetail'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncStockGradeDetail(month: number, year: number): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached stock grade detail')
        return
    }

    try {
        const res = await fetch(
            `${ApiEndPoints.BASE_URL}dashboard/get-grade-detail-overview?month=${month}&year=${year}`,
            { method: 'GET', headers: await authHeaders() },
        )

        const text = await res.text()
        const json = JSON.parse(text)

        if (!res.ok || !json.success) throw new Error(json?.message ?? `HTTP ${res.status}`)

        const d = json.data
        const collection = database.get<StockGradeDetail>('stock_grade_details')

        await database.write(async () => {
            const existing = await collection
                .query(Q.where('month', month), Q.where('year', year))
                .fetch()

            const apply = (record: StockGradeDetail) => {
                record.month = month
                record.year = year
                record.inwardsJson = d.inwards ?? {}
                record.outwardsJson = d.outwards ?? {}
            }

            if (existing.length > 0) {
                await existing[0].update(apply)
            } else {
                await collection.create(apply)
            }
        })

    } catch (err) {
        console.warn('Stock grade detail sync failed, using cached data:', err)
    }
}

// ─── Load from local DB ───────────────────────────────────────────────────────

export async function loadStockGradeDetail(
    month: number,
    year: number,
): Promise<StockGradeDetail | null> {
    const records = await database
        .get<StockGradeDetail>('stock_grade_details')
        .query(Q.where('month', month), Q.where('year', year))
        .fetch()
    return records.length > 0 ? records[0] : null
}
