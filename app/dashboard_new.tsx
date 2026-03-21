import { database } from '@/Database'
import DashboardOverview from '@/Database/DashboardOverview'
import MonthlyTrend from '@/Database/models/MonthlyTrend'
import TopParty from '@/Database/models/TopParty'
import { syncDashboardData } from '@/Services/dashboardSync'
import { getCurrentFinancialYear } from '@/utils/AppUtils'
import { MaterialIcons } from '@expo/vector-icons'
import { Q } from '@nozbe/watermelondb'

import { LogoutSheetRef } from '@/utils/LogoutSheet'
import { Stack, router, useNavigation } from 'expo-router'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { Row } from '../components/Row'
import { Section } from '../components/Section'
import { StatCard } from '../components/StatCard'




// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH = 2
const YEAR = 2026
const FISCAL_YEAR = '2025-26'

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAmount(value: number): string {
  if (value >= 1e7) return `₹ ${(value / 1e7).toFixed(2)} Cr`
  if (value >= 1e5) return `₹ ${(value / 1e5).toFixed(1)} L`
  return `₹ ${value.toLocaleString('en-IN')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PartyRow({
  rank,
  name,
  gstin,
  amount,
  count,
  label,
  last = false,
}: {
  rank: number
  name: string
  gstin: string
  amount: number
  count: number
  label: string
  last?: boolean
}) {
  return (
    <View style={[partyStyles.row, last && partyStyles.lastRow]}>
      <View style={partyStyles.rankBadge}>
        <Text style={partyStyles.rankText}>{rank}</Text>
      </View>
      <View style={partyStyles.info}>
        <Text style={partyStyles.name} numberOfLines={1}>{name}</Text>
        <Text style={partyStyles.gstin}>{gstin}</Text>
      </View>
      <View style={partyStyles.right}>
        <Text style={partyStyles.amount}>{formatAmount(amount)}</Text>
        <Text style={partyStyles.count}>{count} {label}</Text>
      </View>
    </View>
  )
}

function TrendRow({
  label,
  amount,
  count,
  countLabel,
  color,
  last = false,
}: {
  label: string
  amount: number
  count: number
  countLabel: string
  color: string
  last?: boolean
}) {
  return (
    <View style={[trendStyles.row, last && trendStyles.lastRow]}>
      <View style={[trendStyles.dot, { backgroundColor: color }]} />
      <Text style={trendStyles.label}>{label}</Text>
      <View style={trendStyles.right}>
        <Text style={trendStyles.amount}>{formatAmount(amount)}</Text>
        <Text style={trendStyles.count}>{count} {countLabel}</Text>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [customers, setCustomers] = useState<TopParty[]>([])
  const [vendors, setVendors] = useState<TopParty[]>([])
  const [salesTrends, setSalesTrends] = useState<MonthlyTrend[]>([])
  const [purchTrends, setPurchTrends] = useState<MonthlyTrend[]>([])
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const sheetRef = useRef<LogoutSheetRef>(null);


  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => sheetRef.current?.present()} // ✅ IMPORTANT
          style={{ marginRight: 15 }}
        >
          <MaterialIcons name="logout" size={24} />
        </TouchableOpacity>
      ),
    });
  }, []);

  // ── Load all local data ──────────────────────────────────────────────────
  const loadLocal = useCallback(async () => {
    // Overview
    const overviewRecords = await database
      .get<DashboardOverview>('dashboard_overview')
      .query(Q.where('month', MONTH), Q.where('year', YEAR))
      .fetch()
    if (overviewRecords.length > 0) setData(overviewRecords[0])

    // Top customers — sorted by rank
    const customerRecords = await database
      .get<TopParty>('top_parties')
      .query(
        Q.where('party_type', 'customer'),
        Q.where('month', MONTH),
        Q.where('year', YEAR),
        Q.sortBy('rank', Q.asc),
      )
      .fetch()
    setCustomers(customerRecords)

    // Top vendors — sorted by rank
    const vendorRecords = await database
      .get<TopParty>('top_parties')
      .query(
        Q.where('party_type', 'vendor'),
        Q.where('month', MONTH),
        Q.where('year', YEAR),
        Q.sortBy('rank', Q.asc),
      )
      .fetch()
    setVendors(vendorRecords)

    // Monthly trends — sales
    const salesRecords = await database
      .get<MonthlyTrend>('monthly_trends')
      .query(
        Q.where('fiscal_year', FISCAL_YEAR),
        Q.where('trend_type', 'sales'),
        Q.sortBy('month', Q.asc),
      )
      .fetch()
    setSalesTrends(salesRecords)

    // Monthly trends — purchase
    const purchRecords = await database
      .get<MonthlyTrend>('monthly_trends')
      .query(
        Q.where('fiscal_year', FISCAL_YEAR),
        Q.where('trend_type', 'purchase'),
        Q.sortBy('month', Q.asc),
      )
      .fetch()
    setPurchTrends(purchRecords)
  }, [])

  // ── Sync from API then reload ────────────────────────────────────────────
  const runSync = useCallback(async () => {

    // New: top parties + monthly trends sync
    // Pass the raw API responses from your fetch calls here.
    // Example assumes you have fetchTopParties() and fetchMonthlyTrend() services:
    try {
      // Existing overview sync
      await syncDashboardData(MONTH, YEAR, getCurrentFinancialYear())
    } catch (e) {
      // Network failure — offline data remains intact
      console.warn('Sync failed, using cached data:', e)
    }
    await loadLocal()
  }, [loadLocal])

  // On mount: show cached instantly, sync in background
  useEffect(() => {
    loadLocal()
    setSyncing(true)
    runSync().finally(() => setSyncing(false))
  }, [loadLocal, runSync])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync()
    setRefreshing(false)
  }, [runSync])

  // ── Loading state ────────────────────────────────────────────────────────
  if (!data) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.emptyText}>Loading dashboard…</Text>
        <Text style={styles.emptyHint}>Fetching from local database</Text>
      </View>
    )
  }

  const isLoss = data.isProfit === 'No'
  const isGstCredit = data.isPayable === 'No'
  const periodLabel = `${MONTH_NAMES[MONTH]} ${YEAR}`


  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#2563EB"
        />
      }
    >
      <Stack.Screen options={{ title: 'Dashboard' }} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>{periodLabel}</Text>
        </View>
        {syncing && !refreshing && (
          <View style={styles.syncBadge}>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.syncText}>Syncing…</Text>
          </View>
        )}
      </View>

      {/* Hero stats */}
      <View style={styles.heroRow}>
        <StatCard label="Total sales" value={`₹ ${data.totalSales}`} />
      </View>
      <View style={styles.twoCol}>
        <StatCard label="Invoices" value={String(data.totalInvoices)} size="sm" />
        <StatCard label="Bills" value={String(data.totalBills)} size="sm" />
      </View>

      {/* Sales */}
      <Section title="Sales" actionLabel="All Sales" onActionPress={() => { router.push('/SalesListScreen') }}>
        <Row label="Total sales" value={`₹ ${data.totalSales}`} />
        <Row label="IGST collected" value={`₹ ${data.igstCollected}`} />
        <Row label="CGST collected" value={`₹ ${data.cgstCollected}`} />
        <Row label="SGST collected" value={`₹ ${data.sgstCollected}`} last />
      </Section>

      {/* Purchase */}
      <Section title="Purchase" actionLabel="All Purchases" onActionPress={() => { router.push('/purchase') }}>
        <Row label="Total purchase" value={`₹ ${data.totalPurchase}`} />
        <Row label="IGST paid" value={`₹ ${data.igstPaid}`} />
        <Row label="CGST paid" value={`₹ ${data.cgstPaid}`} />
        <Row label="SGST paid" value={`₹ ${data.sgstPaid}`} last />
      </Section>

      {/* Payments */}
      <Section title="Payments" actionLabel="All Payments" onActionPress={() => { router.push('/PaymentListScreen') }}>
        <Row label="Total vouchers" value={String(data.totalVouchers)} />
        <Row label="Total paid" value={`₹ ${data.totalPaid}`} last />
      </Section>

      {/* Journal */}
      <Section title="Journal">
        <Row label="TDS payable" value={`₹ ${data.totalTdsPayable}`} />
        <Row label="PF" value={`₹ ${data.totalPf}`} last />
      </Section>

      {/* Profit & Loss */}
      <Section
        title="Profit & Loss"
        badge={isLoss ? 'Loss' : 'Profit'}
        badgeType={isLoss ? 'loss' : 'profit'}
      >
        <Row label="Gross sales" value={`₹ ${data.grossSales}`} />
        <Row label="Gross purchase" value={`₹ ${data.grossPurchase}`} />
        <Row
          label="Net"
          value={`₹ ${data.net}`}
          accent={isLoss ? 'loss' : 'profit'}
          last
        />
      </Section>

      {/* GST Reconciliation */}
      <Section
        title="GST Reconciliation"
        badge={isGstCredit ? 'Credit' : 'Payable'}
        badgeType={isGstCredit ? 'profit' : 'loss'}
      >
        <Row label="GST collected" value={`₹ ${data.gstCollected}`} />
        <Row label="GST paid" value={`₹ ${data.gstPaid}`} />
        <Row
          label="Net GST liability"
          value={`₹ ${data.netGstLiability}`}
          accent={isGstCredit ? 'profit' : 'loss'}
          last
        />
      </Section>

      {/* ── Top Customers ─────────────────────────────────────────────────── */}
      {customers.length > 0 && (
        <Section title="Top Customers">
          {customers.map((c, i) => (
            <PartyRow
              key={c.id}
              rank={c.rank}
              name={c.partyName}
              gstin={c.gstinUin}
              amount={c.totalAmount}
              count={c.totalCount}
              label={c.totalCount === 1 ? 'invoice' : 'invoices'}
              last={i === customers.length - 1}
            />
          ))}
        </Section>
      )}

      {/* ── Top Vendors ───────────────────────────────────────────────────── */}
      {vendors.length > 0 && (
        <Section title="Top Vendors" actionLabel="All Vendors" onActionPress={() => { router.push('/PartyListScreen') }}>
          {vendors.map((v, i) => (
            <PartyRow
              key={v.id}
              rank={v.rank}
              name={v.partyName}
              gstin={v.gstinUin}
              amount={v.totalAmount}
              count={v.totalCount}
              label={v.totalCount === 1 ? 'bill' : 'bills'}
              last={i === vendors.length - 1}
            />
          ))}
        </Section>
      )}

      {/* ── Monthly Trends ────────────────────────────────────────────────── */}
      {(salesTrends.length > 0 || purchTrends.length > 0) && (
        <Section title={`Monthly Trends — FY ${FISCAL_YEAR}`}>
          {/* Sales rows */}
          {salesTrends.map((s) => (
            <TrendRow
              key={s.id}
              label={`Sales ${s.month}`}
              amount={s.totalAmount}
              count={s.totalCount}
              countLabel={s.totalCount === 1 ? 'invoice' : 'invoices'}
              color="#059669"
            />
          ))}
          {/* Purchase rows */}
          {purchTrends.map((p, i) => (
            <TrendRow
              key={p.id}
              label={`Purchase ${p.month}`}
              amount={p.totalAmount}
              count={p.totalCount}
              countLabel={p.totalCount === 1 ? 'bill' : 'bills'}
              color="#2563EB"
              last={i === purchTrends.length - 1}
            />
          ))}
        </Section>
      )}

      <View style={styles.footer} />

    </ScrollView>


  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  syncText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  heroRow: { marginBottom: 10 },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9CA3AF' },
  footer: { height: 32 },
})

const partyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  lastRow: { borderBottomWidth: 0 },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '500', color: '#111827' },
  gstin: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  amount: { fontSize: 13, fontWeight: '600', color: '#111827' },
  count: { fontSize: 10, color: '#6B7280', marginTop: 1 },
})

const trendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  lastRow: { borderBottomWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  label: { flex: 1, fontSize: 13, color: '#374151' },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 13, fontWeight: '600', color: '#111827' },
  count: { fontSize: 10, color: '#6B7280', marginTop: 1 },
})
