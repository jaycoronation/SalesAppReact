import UpcomingPayment from '@/Database/models/Upcomingpayment'
import { loadUpcomingPayments, syncUpcomingPayments } from '@/Services/DashboardV2Sync'
import { Colors } from '@/utils/colors'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { ShimmerBox } from '@/components/Shimmer'


// ─── Constants ────────────────────────────────────────────────────────────────
const FISCAL_YEAR = '2025-26'

type ActiveTab = 'overdue' | 'upcoming'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number): string {
  if (!val || isNaN(val)) return '₹0'
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)} L`
  return `₹${val.toLocaleString('en-IN')}`
}

function formatUnix(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function urgencyConfig(urgency: string) {
  switch (urgency) {
    case 'overdue': return { dot: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Overdue' }
    case 'critical': return { dot: '#EA580C', bg: '#FFF7ED', border: '#FDBA74', label: 'Critical' }
    case 'urgent': return { dot: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Urgent' }
    default: return { dot: Colors.brandColor, bg: Colors.brandColorLight, border: Colors.brandColor, label: 'Upcoming' }
  }
}

function totalOutstanding(list: UpcomingPayment[]): number {
  return list.reduce((sum, r) => sum + r.outstanding, 0)
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ item, last }: { item: UpcomingPayment; last: boolean }) {
  const ug = urgencyConfig(item.urgency)

  const daysLabel = item.isOverdue === 1
    ? `${item.daysOverdue}d overdue`
    : item.daysUntil === 0
      ? 'Due today'
      : `${item.daysUntil}d left`

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[s.row, { backgroundColor: ug.bg, borderColor: ug.border }, last && s.rowLast]}
      onPress={() =>
        router.push({
          pathname: '/(main)/purchase/PurchaseDetailScreen',
          params: { purchaseId: item.purchaseId },
        })
      }
    >
      {/* Urgency dot */}
      <View style={[s.dot, { backgroundColor: ug.dot }]} />

      {/* Main content */}
      <View style={s.rowLeft}>
        <View style={s.rowTopRow}>
          <Text style={s.partyName} numberOfLines={1}>{item.partyName}</Text>
          <View style={[s.urgencyPill, { backgroundColor: ug.dot + '22', borderColor: ug.dot + '55' }]}>
            <Text style={[s.urgencyText, { color: ug.dot }]}>{ug.label}</Text>
          </View>
        </View>
        <Text style={s.voucherNo}>{item.voucherNo}</Text>
        <Text style={s.dates}>
          Due: {item.dueDate}
          {item.gstinUin ? `  ·  ${item.gstinUin}` : ''}
        </Text>
      </View>

      {/* Amount + days */}
      <View style={s.rowRight}>
        <Text style={[s.amount, { color: ug.dot }]}>{fmt(item.outstanding)}</Text>
        <Text style={[s.daysLabel, { color: ug.dot }]}>{daysLabel}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Shimmer Loading Layout ──────────────────────────────────────────────────

function ShimmerUpcomingPayments() {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <View>
            <ShimmerBox width={150} height={18} style={{ marginBottom: 4 }} />
          </View>
        </View>
        <View style={s.tabsRow}>
           <View style={{ flex: 1 }}><ShimmerBox height={35} borderRadius={10} /></View>
           <View style={{ flex: 1 }}><ShimmerBox height={35} borderRadius={10} /></View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[s.row, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <View style={[s.dot, { backgroundColor: '#E5E7EB' }]} />
            <View style={s.rowLeft}>
              <ShimmerBox width="60%" height={14} style={{ marginBottom: 6 }} />
              <ShimmerBox width="40%" height={12} style={{ marginBottom: 6 }} />
              <ShimmerBox width="50%" height={10} />
            </View>
            <View style={s.rowRight}>
              <ShimmerBox width={60} height={16} style={{ marginBottom: 6 }} />
              <ShimmerBox width={40} height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UpcomingPaymentsScreen() {
  const [overdueList, setOverdueList] = useState<UpcomingPayment[]>([])
  const [upcomingList, setUpcomingList] = useState<UpcomingPayment[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('overdue')
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { tab } = useLocalSearchParams();


  const loadLocal = useCallback(async () => {
    const [od, up] = await Promise.all([
      loadUpcomingPayments(FISCAL_YEAR, 'overdue'),
      loadUpcomingPayments(FISCAL_YEAR, 'upcoming'),
    ])
    setOverdueList(od)
    setUpcomingList(up)
  }, [])

  const runSync = useCallback(async () => {
    await Promise.all([
      syncUpcomingPayments(FISCAL_YEAR, 'overdue'),
      syncUpcomingPayments(FISCAL_YEAR, 'upcoming'),
    ])
    await loadLocal()
  }, [loadLocal])

  useEffect(() => {
    if (tab === 'overdue' || tab === 'upcoming') {
      setActiveTab(tab);
    }
    loadLocal()
    setSyncing(true)
    runSync().finally(() => setSyncing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync()
    setRefreshing(false)
  }, [runSync])

  const activeList = activeTab === 'overdue' ? overdueList : upcomingList
  const totalAmt = totalOutstanding(activeList)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (overdueList.length === 0 && upcomingList.length === 0 && syncing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Upcoming Payments',
            headerShown: true,
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <ShimmerUpcomingPayments />
      </>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'Upcoming Payments',
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <View>
            {/* <Text style={s.title}>Payments</Text> */}
            <Text style={s.subtitle}>
              {activeList.length} records · {fmt(totalAmt)}
            </Text>
          </View>
          {syncing && !refreshing && (
            <View style={s.syncBadge}>
              <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
              <Text style={s.syncText}>Syncing…</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={s.tabsRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'overdue' && s.tabActiveRed]}
            onPress={() => setActiveTab('overdue')}
          >
            <Text style={[s.tabText, activeTab === 'overdue' && s.tabTextRed]}>
              Overdue ({overdueList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'upcoming' && s.tabActiveBlue]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[s.tabText, activeTab === 'upcoming' && s.tabTextBlue]}>
              Upcoming ({upcomingList.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeList}
        keyExtractor={(item) => `${item.syncType}-${item.purchaseId}`}
        renderItem={({ item, index }) => (
          <PaymentRow item={item} last={index === activeList.length - 1} />
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No {activeTab} payments</Text>
          </View>
        }
        ListFooterComponent={<View style={s.footer} />}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280' },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  footer: { height: 32 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },

  // Header
  header: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor },
  syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },

  // Tabs
  tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#E5E7EB', alignItems: 'center' },
  tabActiveRed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  tabActiveBlue: { backgroundColor: Colors.brandColorLight, borderColor: Colors.brandColor },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextRed: { color: '#DC2626', fontWeight: '600' },
  tabTextBlue: { color: Colors.brandColor, fontWeight: '600' },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    gap: 10,
  },
  rowLast: { marginBottom: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginTop: 2 },
  rowLeft: { flex: 1, gap: 3 },
  rowTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partyName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
  urgencyPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, flexShrink: 0 },
  urgencyText: { fontSize: 10, fontWeight: '600' },
  voucherNo: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
  dates: { fontSize: 11, color: '#9CA3AF' },
  rowRight: { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  amount: { fontSize: 14, fontWeight: '700' },
  daysLabel: { fontSize: 11, fontWeight: '500' },
})
