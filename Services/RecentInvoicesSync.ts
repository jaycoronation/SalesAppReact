import { database } from '@/Database'
import DashboardOverviewV2 from '@/Database/models/dashboardoverview'
import { ApiEndPoints } from "@/network/ApiEndPoint"
import { SessionManager } from '@/utils/sessionManager'
import { Q } from '@nozbe/watermelondb'
import NetInfo from '@react-native-community/netinfo'

async function authHeaders(): Promise<Record<string, string>> {
    const token = await SessionManager.getToken()
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
    }
}

export async function syncRecentInvoices(month: number, year: number): Promise<void> {
    const { isConnected } = await NetInfo.fetch()
    if (!isConnected) {
        console.log('Offline — serving cached recent invoices')
        return
    }

    try {
        const url = `${ApiEndPoints.DASHBOARD_INVOICES_LIST}?month=${month}&year=${year}`;
        const res = await fetch(url, { method: 'GET', headers: await authHeaders() })
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        if (!json.success) throw new Error(json.message)

        const recentInvoices = json.data ?? []
        const collection = database.get<DashboardOverviewV2>('dashboard_overview_v2')

        await database.write(async () => {
            const existing = await collection
                .query(Q.where('month', month), Q.where('year', year))
                .fetch()

            const apply = (record: DashboardOverviewV2) => {
                record.month = month
                record.year = year
                record.recentInvoicesJson = JSON.stringify(recentInvoices)
            }

            if (existing.length > 0) {
                await existing[0].update(apply)
            } else {
                await collection.create(apply)
            }
        })

    } catch (err) {
        console.warn('Recent invoices sync failed:', err)
    }
}
