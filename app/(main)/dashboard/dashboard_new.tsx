import DashboardOverviewV2, {
  AgingBucket,
  RecentInvoiceItem,
  StockGradeItem,
  StockOverview,
  UpcomingPaymentItem,
} from '@/Database/models/dashboardoverview';
import {
  loadDashboardV2,
  observeDashboardV2,
  syncDashboardV2,
  syncUpcomingPayments,
} from '@/Services/DashboardV2Sync';
import { Colors } from '@/utils/colors';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


// ─── Constants ────────────────────────────────────────────────────────────────
const NOW = new Date()
const DEFAULT_MONTH = NOW.getMonth() + 1   // 1–12
const DEFAULT_YEAR = NOW.getFullYear()

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

const MONTH_SHORT: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
  5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
  9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
}

function getFiscalYear(month: number, year: number): string {
  if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`
  return `${year - 1}-${String(year).slice(-2)}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number | null | undefined): string {
  const n = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (!n || isNaN(n)) return '₹0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`
  return `${sign}₹${abs.toLocaleString('en-IN')}`
}

function urgencyStyle(urgency: string) {
  switch (urgency) {
    case 'overdue': return { dot: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
    case 'critical': return { dot: '#EA580C', bg: '#FFF7ED', border: '#FDBA74' }
    case 'urgent': return { dot: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }
    default: return { dot: Colors.brandColor, bg: Colors.brandColorLight, border: Colors.brandColor }
  }
}

function statusBadgeStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid': return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }
    case 'partial': return { bg: '#FEF9C3', text: '#92400E', border: '#FDE68A' }
    default: return { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title, actionLabel, onAction, badge, badgeType = 'neutral',
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  badge?: string
  badgeType?: 'profit' | 'loss' | 'neutral'
}) {
  return (
    <View style={s.sectionHeader}>
      {/* Left: title + badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {badge !== undefined && (
          <View style={[
            s.badge,
            badgeType === 'profit' && s.badgeProfit,
            badgeType === 'loss' && s.badgeLoss,
          ]}>
            <Text style={[
              s.badgeText,
              badgeType === 'profit' && s.badgeTextProfit,
              badgeType === 'loss' && s.badgeTextLoss,
            ]}>
              {badge}
            </Text>
          </View>
        )}
      </View>

      {/* Right: action */}
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={s.sectionAction}>
          <Text style={s.sectionActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function KpiCard({
  label, value, sub, accent, onAction
}: { label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'amber' | 'blue', onAction?: () => void }) {
  const colors = {
    green: '#059669', red: '#DC2626', amber: '#D97706', blue: Colors.brandColor,
  }
  return (

    <View style={s.kpiCard}>
      <TouchableOpacity onPress={onAction}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Text style={[s.kpiValue, accent && { color: colors[accent] }]}>{value}</Text>
        {sub && <Text style={s.kpiSub}>{sub}</Text>}
      </TouchableOpacity>
    </View>

  )
}

// function AgingBar({ buckets, title }: { buckets: Record<string, AgingBucket>, title: string }) {
//   const order = ['paid', 'd0_7', 'd7_15', 'd15_30', 'over_30']
//   const colors = ['#059669', '#2563EB', '#D97706', '#EA580C', '#DC2626']
//   const total = order.reduce((s, k) => s + parseFloat(buckets[k]?.amount || '0'), 0)
//   if (!total) return null

//   // Override the first bucket label based on context
//   const firstBucketLabel = title === 'Receivables' ? 'Received' : 'Paid'

//   return (
//     <View style={s.agingBarWrap}>
//       <View style={s.agingBar}>
//         {order.map((k, i) => {
//           const pct = (parseFloat(buckets[k]?.amount || '0') / total) * 100
//           if (pct < 1) return null
//           return (
//             <View
//               key={k}
//               style={[s.agingSegment, { width: `${pct}%` as any, backgroundColor: colors[i] }]}
//             />
//           )
//         })}
//       </View>
//       <View style={s.agingLegend}>
//         {order.map((k, i) => {
//           const bucket = buckets[k]
//           if (!bucket || parseFloat(bucket.amount) === 0) return null
//           return (
//             <View key={k} style={s.agingLegendItem}>
//               <View style={[s.agingDot, { backgroundColor: colors[i] }]} />
//               <Text style={s.agingLegendLabel}>
//                 {i === 0 ? firstBucketLabel : bucket.label} ({bucket.count})
//               </Text>
//               <Text style={s.agingLegendVal}>{fmt(bucket.amount)}</Text>
//             </View>
//           )
//         })}
//       </View>
//     </View>
//   )
// }

function AgingBar({
  buckets,
  title,
  onBucketPress,
}: {
  buckets: Record<string, AgingBucket>
  title?: string
  onBucketPress?: (bucketKey: string) => void
}) {
  const order = ['paid', 'd0_7', 'd7_15', 'd15_30', 'over_30']
  const colors = ['#059669', '#2563EB', '#D97706', '#EA580C', '#DC2626']
  const total = order.reduce((s, k) => s + parseFloat(buckets[k]?.amount || '0'), 0)
  if (!total) return null

  const firstLabel = title === 'Receivables' ? 'Received' : 'Paid'

  return (
    <View style={s.agingBarWrap}>
      {/* Segmented bar — each segment tappable */}
      <View style={s.agingBar}>
        {order.map((k, i) => {
          const pct = (parseFloat(buckets[k]?.amount || '0') / total) * 100
          if (pct < 1) return null
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={onBucketPress ? 0.65 : 1}
              onPress={() => onBucketPress?.(k)}
              style={[s.agingSegment, { width: `${pct}%` as any, backgroundColor: colors[i] }]}
            />
          )
        })}
      </View>
      {/* Legend rows — also tappable */}
      <View style={s.agingLegend}>
        {order.map((k, i) => {
          const bucket = buckets[k]
          if (!bucket || parseFloat(bucket.amount) === 0) return null
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={onBucketPress ? 0.65 : 1}
              onPress={() => onBucketPress?.(k)}
              style={s.agingLegendItem}
            >
              <View style={[s.agingDot, { backgroundColor: colors[i] }]} />
              <Text style={s.agingLegendLabel}>
                {i === 0 ? firstLabel : bucket.label} ({bucket.count})
              </Text>
              <Text style={s.agingLegendVal}>{fmt(bucket.amount)}</Text>
              {onBucketPress && (
                <Text style={[s.agingChevron, { color: colors[i] }]}>›</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function UpcomingRow({ item }: { item: UpcomingPaymentItem }) {
  const ug = urgencyStyle(item.urgency)
  const daysLabel = item.urgency === 'overdue'
    ? `${item.days_overdue}d overdue`
    : item.days_until === '0' ? 'Due today' : `${item.days_until}d left`

  return (
    <TouchableOpacity
      style={[s.upcomingRow, { backgroundColor: ug.bg, borderColor: ug.border }]}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/(main)/purchase/PurchaseDetailScreen',
          params: { purchaseId: item.purchase_id },
        })
      }
    >
      <View style={[s.upcomingDot, { backgroundColor: ug.dot }]} />
      <View style={s.upcomingLeft}>
        <Text style={s.upcomingParty} numberOfLines={1}>{item.party_name}</Text>
        <Text style={s.upcomingVoucher}>{item.voucher_no} · {item.due_date}</Text>
      </View>
      <View style={s.upcomingRight}>
        <Text style={s.upcomingAmount}>{fmt(item.outstanding)}</Text>
        <Text style={[s.upcomingDaysLabel, { color: ug.dot }]}>{daysLabel}</Text>
      </View>
    </TouchableOpacity>
  )
}

function RecentInvoiceRow({ item }: { item: RecentInvoiceItem }) {
  const bs = statusBadgeStyle(item.payment_status)
  return (
    <TouchableOpacity
      style={s.invoiceRow}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '../../sale/SaleDetailScreen',
          params: { saleId: item.sale_id },
        })
      }
    >
      <View style={s.invoiceLeft}>
        <Text style={s.invoiceParty} numberOfLines={1}>{item.party_name}</Text>
        <Text style={s.invoiceVoucher}>{item.voucher_no} · {item.txn_date}</Text>
      </View>
      <View style={s.invoiceRight}>
        <Text style={s.invoiceAmount}>{fmt(item.gross_total)}</Text>
        <View style={[s.invoiceBadge, { backgroundColor: bs.bg, borderColor: bs.border }]}>
          <Text style={[s.invoiceBadgeText, { color: bs.text }]}>{item.status_display}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Stock Overview Table ─────────────────────────────────────────────────────

function StockOverviewCard({ stock }: { stock: StockOverview }) {
  const rows: { label: string; key: keyof StockOverview; color?: string }[] = [
    { label: 'Opening', key: 'opening' },
    { label: 'Inwards', key: 'inwards', color: '#059669' },
    { label: 'Outwards', key: 'outwards', color: '#DC2626' },
    { label: 'Net', key: 'total' },
  ]

  function fmtQty(v: string) {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return '—'
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  return (
    <View style={st.tableCard}>
      {/* Header row */}
      <View style={[st.tableRow, st.tableHead]}>
        <Text style={[st.tableCell, st.tableHeadText, { flex: 1.4 }]}>Movement</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Qty</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Avg ₹</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Value</Text>
      </View>

      {rows.map(({ label, key, color }, i) => {
        const r = stock?.[key]
        const isLast = i === rows.length - 1
        const qty = fmtQty(r?.qty ?? '')
        const qtyNum = parseFloat(r?.qty ?? '0')
        const qtyColor = key === 'total'
          ? (qtyNum < 0 ? '#DC2626' : '#059669')
          : color

        return (
          <View
            key={label}
            style={[
              st.tableRow,
              isLast && st.tableRowLast,
              key === 'total' && st.tableRowTotal,
            ]}
          >
            <Text style={[st.tableCell, st.labelCell, { flex: 1.4 }]}>{label}</Text>
            <Text style={[st.tableCell, st.right, qtyColor ? { color: qtyColor, fontWeight: '600' } : {}]}>
              {qty}
            </Text>
            <Text style={[st.tableCell, st.right]}>
              {r?.avg ? `₹${parseFloat(r.avg).toFixed(2)}` : '—'}
            </Text>
            <Text style={[st.tableCell, st.right, { fontWeight: isLast ? '700' : '500' }]}>
              {r?.value ? fmt(r.value) : '—'}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

// ─── Stock Grade Table ────────────────────────────────────────────────────────

function StockGradeTable({ grades }: { grades: StockGradeItem[] }) {
  // Separate rows from the TOTAL footer row
  const dataRows = grades.filter(g => g.details !== 'TOTAL')
  const totalRow = grades.find(g => g.details === 'TOTAL')

  function fmtQty(v: string) {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return '—'
    return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }

  const gradeColors: Record<string, string> = {
    'NA': '#6B7280',
    '202': '#2563EB',
    '304': '#059669',
    '316': '#9333EA',
  }

  return (
    <View style={st.tableCard}>
      {/* Header */}
      <View style={[st.tableRow, st.tableHead]}>
        <Text style={[st.tableCell, st.tableHeadText, { flex: 0.7 }]}>Grade</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Qty</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Avg ₹</Text>
        <Text style={[st.tableCell, st.tableHeadText, st.right]}>Value</Text>
      </View>

      {dataRows.map((g, i) => (
        <View
          key={`${g.grade}-${i}`}
          style={[st.tableRow, i === dataRows.length - 1 && !totalRow && st.tableRowLast]}
        >
          <View style={[{ flex: 0.7 }, st.tableCell]}>
            <View style={[st.gradePill, { backgroundColor: (gradeColors[g.grade] ?? '#6B7280') + '18' }]}>
              <Text style={[st.gradePillText, { color: gradeColors[g.grade] ?? '#6B7280' }]}>
                {g.grade || 'NA'}
              </Text>
            </View>
          </View>
          <Text style={[st.tableCell, st.right]}>{fmtQty(g.qty)}</Text>
          <Text style={[st.tableCell, st.right]}>
            {g.avg ? `₹${parseFloat(g.avg).toFixed(2)}` : '—'}
          </Text>
          <Text style={[st.tableCell, st.right, { fontWeight: '500' }]}>{fmt(g.value)}</Text>
        </View>
      ))}

      {/* Total footer */}
      {totalRow && (
        <View style={[st.tableRow, st.tableRowTotal, st.tableRowLast]}>
          <Text style={[st.tableCell, { flex: 0.7, fontWeight: '700', color: '#111827' }]}>Total</Text>
          <Text style={[st.tableCell, st.right, { fontWeight: '700', color: '#111827' }]}>
            {fmtQty(totalRow.qty)}
          </Text>
          <Text style={[st.tableCell, st.right]}>—</Text>
          <Text style={[st.tableCell, st.right, { fontWeight: '700', color: '#111827' }]}>
            {fmt(totalRow.value)}
          </Text>
        </View>
      )}
    </View>
  )
}


// ─── Month / Year Picker ──────────────────────────────────────────────────────

function MonthYearPicker({
  visible,
  month,
  year,
  onApply,
  onClose,
}: {
  visible: boolean
  month: number
  year: number
  onApply: (month: number, year: number) => void
  onClose: () => void
}) {
  const [selYear, setSelYear] = useState(year)
  const [selMonth, setSelMonth] = useState(month)

  // Reset picker state whenever it opens
  useEffect(() => {
    if (visible) { setSelYear(year); setSelMonth(month) }
  }, [visible])

  const minYear = DEFAULT_YEAR - 3
  const maxYear = DEFAULT_YEAR

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={pk.overlay} onPress={onClose}>
        <Pressable style={pk.sheet} onPress={() => { }}>
          {/* Handle */}
          <View style={pk.handle} />

          <Text style={pk.sheetTitle}>Select Month & Year</Text>

          {/* Year selector */}
          <View style={pk.yearRow}>
            <TouchableOpacity
              style={[pk.yearArrow, selYear <= minYear && pk.yearArrowDisabled]}
              onPress={() => selYear > minYear && setSelYear(v => v - 1)}
              hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
            >
              <Text style={[pk.yearArrowText, selYear <= minYear && { color: '#D1D5DB' }]}>‹</Text>
            </TouchableOpacity>
            <Text style={pk.yearLabel}>{selYear}</Text>
            <TouchableOpacity
              style={[pk.yearArrow, selYear >= maxYear && pk.yearArrowDisabled]}
              onPress={() => selYear < maxYear && setSelYear(v => v + 1)}
              hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
            >
              <Text style={[pk.yearArrowText, selYear >= maxYear && { color: '#D1D5DB' }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Month grid */}
          <View style={pk.monthGrid}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const isActive = m === selMonth && selYear === selYear
              const isCurrent = m === selMonth
              const isFuture = selYear === DEFAULT_YEAR && m > DEFAULT_MONTH
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    pk.monthBtn,
                    isCurrent && pk.monthBtnActive,
                    isFuture && pk.monthBtnDisabled,
                  ]}
                  onPress={() => !isFuture && setSelMonth(m)}
                  activeOpacity={isFuture ? 1 : 0.7}
                >
                  <Text style={[
                    pk.monthBtnText,
                    isCurrent && pk.monthBtnTextActive,
                    isFuture && pk.monthBtnTextDisabled,
                  ]}>
                    {MONTH_SHORT[m]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Actions */}
          <View style={pk.actions}>
            <TouchableOpacity style={pk.cancelBtn} onPress={onClose}>
              <Text style={pk.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={pk.applyBtn}
              onPress={() => { onApply(selMonth, selYear); onClose() }}
            >
              <Text style={pk.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardOverviewV2 | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [logoutVisible, setLogoutVisible] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  // true only until the very first cache read completes — never set back to true
  const [initialLoading, setInitialLoading] = useState(true)

  // ── Month / Year filter ────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH)
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)

  const fiscalYear = getFiscalYear(selectedMonth, selectedYear)

  const loadLocal = useCallback(async (month: number, year: number) => {
    const cached = await loadDashboardV2(month, year)
    if (cached) setData(cached)
    // Mark initial load done regardless of whether cache existed
    setInitialLoading(false)
  }, [])

  const runSync = useCallback(async (month: number, year: number) => {
    const fy = getFiscalYear(month, year)
    await Promise.all([
      syncDashboardV2(month, year),
      syncUpcomingPayments(fy, 'upcoming'),
      syncUpcomingPayments(fy, 'overdue'),
    ])
    await loadLocal(month, year)
  }, [loadLocal])

  // Re-subscribe + re-sync whenever month/year changes
  useEffect(() => {
    // ⚠️ Do NOT call setData(null) here — that clears cached data and forces
    // the loader to show. Instead keep stale data visible until new data loads.
    const subscription = observeDashboardV2(selectedMonth, selectedYear)
      .observe()
      .subscribe((records) => {
        if (records.length > 0) setData(records[0])
      })

    // Load from local DB first (fast, works offline), then sync in background
    loadLocal(selectedMonth, selectedYear)
    setSyncing(true)
    runSync(selectedMonth, selectedYear).finally(() => setSyncing(false))

    return () => subscription.unsubscribe()
  }, [selectedMonth, selectedYear])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync(selectedMonth, selectedYear)
    setRefreshing(false)
  }, [runSync, selectedMonth, selectedYear])

  const handleFilterApply = useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
  }, [])

  // ── Loading — only block render when there is genuinely nothing to show ─────
  // initialLoading=true + no data = first ever launch with no cache at all
  if (initialLoading && !data) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Dashboard', headerBackButtonDisplayMode: 'minimal' }} />
        <ActivityIndicator size="large" color={Colors.brandColor} />
        <Text style={s.loadingText}>Loading dashboard…</Text>
      </View>
    )
  }

  // Cache read finished but nothing stored — show empty state instead of hanging
  if (!data) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ title: 'Dashboard', headerBackButtonDisplayMode: 'minimal' }} />
        <Text style={s.errorText}>No data available</Text>
        <Text style={s.loadingText}>Pull down to refresh when online</Text>
      </View>
    )
  }

  const handleLogout = () => {
    // your logout logic here (clear tokens, auth state, etc.)
    SessionManager.clearSession();
    setLogoutVisible(false);
    router.replace('/login');
  };

  const kpi = data.kpi
  const netPos = data.netPosition
  const recAging = data.receivablesAging
  const payAging = data.payablesAging
  const overdueList = data.upcomingOverdue.slice(0, 5)
  const upcomingList = data.upcomingUpcoming.slice(0, 5)
  const recentInvoices = data.recentInvoices.slice(0, 5)
  const pl = data.profitLoss
  const isLoss = data.profitLoss.is_profit === 'No'
  const overdueCount = data.totalOverdueCount;
  const overdueAmount = data.totalOverdueAmount;
  const upccomingCount = data.totalUpcomingCount;
  const upccomingAmount = data.totalUpcomingAmount;
  const stockOverview = data.stockOverview
  const stockGrades = data.stockGradeOverview

  const gstIsRefund = kpi?.gst?.is_refund === '1'
  const netGst = parseFloat(kpi?.gst?.net_payable || '0')

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
      }
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Dashboard',
          headerBackVisible: false,
          headerRight: () => (
            <View style={{ marginRight: 12 }}>
              <TouchableOpacity
                onPress={() => setLogoutVisible(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
              >
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <Modal
        transparent
        visible={logoutVisible}
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <Pressable style={s.overlay} onPress={() => setLogoutVisible(false)}>
          <Pressable style={s.dialog} onPress={() => { }}>
            <Text style={s.title}>Log out of your account?</Text>

            <View style={s.divider} />

            <TouchableOpacity
              style={s.actionBtn}
              onPress={handleLogout}
            >
              <Text style={s.logoutText}>Log out</Text>
            </TouchableOpacity>

            <View style={s.divider} />

            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => setLogoutVisible(false)}
            >
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Month / Year Picker ───────────────────────────────────────────── */}
      <MonthYearPicker
        visible={pickerVisible}
        month={selectedMonth}
        year={selectedYear}
        onApply={handleFilterApply}
        onClose={() => setPickerVisible(false)}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Dashboard</Text>
          <Text style={s.headerSub}>{MONTH_NAMES[selectedMonth]} {selectedYear}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {syncing && !refreshing && (
            <View style={s.syncBadge}>
              <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
              <Text style={s.syncText}>Syncing…</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={s.filterBtnIcon}>📅</Text>
            <Text style={s.filterBtnText}>
              {MONTH_SHORT[selectedMonth]} {selectedYear}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <View style={s.kpiRow}>
        <KpiCard
          label="Total Sales"
          value={fmt(kpi?.sales?.total_sales)}
          sub={`${kpi?.sales?.total_invoices ?? 0} invoices`}
          accent="green"
          onAction={() => router.push('../../sales/SalesListScreen')}
        />
        <KpiCard
          label="Total Purchases"
          value={fmt(kpi?.purchases?.total_purchase)}
          sub={`${kpi?.purchases?.total_bills ?? 0} bills`}
          accent="red"
          onAction={() => router.push('../../purchases/PurchaseListScreen')}
        />
      </View>
      <View style={s.kpiRow}>
        <KpiCard
          label={gstIsRefund ? 'GST Refund' : 'GST Payable'}
          value={fmt(Math.abs(netGst))}
          sub={`Output: ${fmt(kpi?.gst?.output_tax)} · ITC: ${fmt(kpi?.gst?.input_tax_credit)}`}
          accent={gstIsRefund ? 'green' : 'amber'}
        />
        <KpiCard
          label="TDS"
          value={fmt(kpi?.tds?.total_tds)}
          sub={`${kpi?.tds?.total_entries ?? 0} entries`}
          accent="blue"
        />
      </View>

      {/* ── Net Position ─────────────────────────────────────────────────── */}
      <View style={s.card}>
        <SectionHeader title="Net position" />
        <View style={s.netRow}>
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Receivable</Text>
            <Text style={[s.netValue, s.green]}>{fmt(netPos?.total_receivable)}</Text>
            <Text style={s.netSub}>Overdue: {fmt(netPos?.overdue_receivable)}</Text>
          </View>
          <View style={s.netDivider} />
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Payable</Text>
            <Text style={[s.netValue, s.red]}>{fmt(netPos?.total_payable)}</Text>
            <Text style={s.netSub}>Overdue: {fmt(netPos?.overdue_payable)}</Text>
          </View>
          <View style={s.netDivider} />
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Net</Text>
            <Text style={[s.netValue, parseFloat(netPos?.net || '0') >= 0 ? s.green : s.red]}>
              {fmt(netPos?.net)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Profit & Loss ────────────────────────────────────────────── */}
      <View style={s.card}>
        <SectionHeader title="Profit & Loss" badge={pl?.is_profit === 'Yes' ? '▲ Profit' : '▼ Loss'}
          badgeType={pl?.is_profit === 'Yes' ? 'profit' : 'loss'} />
        <View style={s.netRow}>
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Gross Sales</Text>
            <Text style={[s.netValue, s.green]}>{fmt(pl?.gross_sales)}</Text>
          </View>
          <View style={s.netDivider} />
          <View style={s.netBlock}>
            <Text style={s.netLabel}>Gross Purchase</Text>
            <Text style={[s.netValue, s.red]}>{fmt(pl?.gross_purchase)}</Text>
          </View>
          <View style={s.netDivider} />
          <View style={s.netBlock}>
            <Text style={s.netLabel}>{pl?.is_profit === 'Yes' ? 'Net Profit' : 'Net Loss'}</Text>
            <Text style={[s.netValue, pl?.is_profit === 'Yes' ? s.green : s.red]}>
              {fmt(pl?.net)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Receivables Aging ────────────────────────────────────────────── */}
      <View style={s.card}>
        <SectionHeader
          title="Receivables"
        />
        <View style={s.agingMeta}>
          <Text style={s.agingTotal}>{fmt(recAging?.total_outstanding)}</Text>
          <Text style={s.agingCount}>{recAging?.total_count} invoices</Text>
        </View>
        {recAging?.buckets && <AgingBar
          buckets={recAging.buckets}
          title="Receivables"
          onBucketPress={(bucketKey) =>
            router.push({
              pathname: '../../others/SalesRegisterScreen',
              params: { btwnDays: bucketKey, fiscalYear: fiscalYear },
            })
          }
        />}
      </View>

      {/* ── Payables Aging ───────────────────────────────────────────────── */}
      <View style={s.card}>
        <SectionHeader
          title="Payables"

        />
        <View style={s.agingMeta}>
          <Text style={[s.agingTotal, s.red]}>{fmt(payAging?.total_outstanding)}</Text>
          <Text style={s.agingCount}>{payAging?.total_count} bills</Text>
        </View>
        {payAging?.buckets && (
          <AgingBar
            buckets={payAging.buckets}
            title="Payables"
            onBucketPress={(bucketKey) =>
              router.push({
                pathname: '../../others/PurchaseRegisterScreen',
                params: { btwnDays: bucketKey, fiscalYear: fiscalYear },
              })
            }
          />
        )}
      </View>

      {/* ── Stock Overview ───────────────────────────────────────────────── */}
      {stockOverview?.inwards && (
        <View style={s.card}>
          <SectionHeader title="Stock Overview" />
          <StockOverviewCard stock={stockOverview} />
        </View>
      )}

      {/* ── Sales by Grade ───────────────────────────────────────────────── */}
      {stockGrades?.length > 0 && (
        <View style={s.card}>
          <SectionHeader title="Sales by Grade" />
          <StockGradeTable grades={stockGrades} />
          <TouchableOpacity
            style={s.breakdownBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '../../stock/StockGradeDetailScreen',
                params: { month: String(selectedMonth), year: String(selectedYear) },
              })
            }
          >
            <Text style={s.breakdownBtnText}>View Breakdown →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.kpiRow}>
        <KpiCard
          label="Overdue Payments"
          value={fmt(overdueAmount)}
          sub={`${overdueCount} invoices`}
          accent="red"
          onAction={() => router.push({ pathname: '../../others/UpcomingPaymentsScreen', params: { tab: 'overdue' } })}
        />
        <KpiCard
          label="Upcoming Payments"
          value={fmt(upccomingAmount)}
          sub={`${upccomingCount} invoices`}
          accent="red"
          onAction={() => router.push({ pathname: '../../others/UpcomingPaymentsScreen', params: { tab: 'upcoming' } })}
        />
      </View>

      {/* ── Overdue Payments ─────────────────────────────────────────────── */}
      {/* {overdueList.length > 0 && (
        <View style={s.card}>
          <SectionHeader
            title={`Overdue payments (${data.upcomingOverdue.length})`}
            actionLabel="View All"
            onAction={() => router.push('/UpcomingPaymentsScreen')}
          />
          {overdueList.map((item) => (
            <UpcomingRow key={item.purchase_id} item={item} />
          ))}
        </View>
      )} */}

      {/* ── Upcoming Payments ────────────────────────────────────────────── */}
      {/* {upcomingList.length > 0 && (
        <View style={s.card}>
          <SectionHeader
            title={`Upcoming payments (${data.upcomingUpcoming.length})`}
            actionLabel="View All"
            onAction={() => router.push('/UpcomingPaymentsScreen')}
          />
          {upcomingList.map((item) => (
            <UpcomingRow key={item.purchase_id} item={item} />
          ))}
        </View>
      )} */}

      {/* ── Recent Invoices ──────────────────────────────────────────────── */}
      {recentInvoices.length > 0 && (
        <View style={s.card}>
          <SectionHeader
            title="Recent invoices"
            actionLabel="See All"
            onAction={() => router.push({ pathname: '../../others/RecentInvoicesScreen', params: { month: selectedMonth, year: selectedYear } })}
          />
          {recentInvoices.map((item, i) => (
            <View key={item.sale_id}>
              <RecentInvoiceRow item={item} />
              {i < recentInvoices.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>
      )}

      {/* ── Quick links ──────────────────────────────────────────────────── */}
      {/* <View style={s.quickRow}>
        {([
          { label: 'Parties', route: '/PartyListScreen' },
          { label: 'Payments', route: '/PaymentListScreen' },
        ] as const).map((q) => (
          <TouchableOpacity
            key={q.label}
            style={s.quickBtn}
            onPress={() => router.push(q.route as any)}
          >
            <Text style={s.quickBtnText}>{q.label} →</Text>
          </TouchableOpacity>
        ))}
      </View> */}

      <View style={s.footer} />
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  footer: { height: 82 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor },
  syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  filterBtnIcon: { fontSize: 13 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#E5E7EB' },
  kpiLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: -0.3, marginBottom: 2 },
  kpiSub: { fontSize: 11, color: '#6B7280' },

  // Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 0.5, borderColor: '#E5E7EB' },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionAction: { backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: Colors.brandColorLight },
  sectionActionText: { fontSize: 12, fontWeight: '500', color: Colors.brandColor },

  // Net position
  netRow: { flexDirection: 'row', alignItems: 'flex-start' },
  netBlock: { flex: 1 },
  netDivider: { width: 0.5, backgroundColor: '#E5E7EB', alignSelf: 'stretch', marginHorizontal: 12 },
  netLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  netValue: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  netSub: { fontSize: 10, color: '#9CA3AF' },
  green: { color: '#059669' },
  red: { color: '#DC2626' },

  // Aging bar
  agingMeta: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  agingTotal: { fontSize: 18, fontWeight: '700', color: '#111827' },
  agingCount: { fontSize: 12, color: '#9CA3AF' },
  agingBarWrap: { gap: 10 },
  agingBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  agingSegment: { height: 8 },
  agingLegend: { gap: 6 },
  agingLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agingDot: { width: 8, height: 8, borderRadius: 4 },
  agingLegendLabel: { fontSize: 12, color: '#6B7280', flex: 1 },
  agingLegendVal: { fontSize: 12, fontWeight: '500', color: '#111827' },
  agingChevron: { fontSize: 16, fontWeight: '600', marginLeft: 4 },

  // Upcoming / overdue rows
  upcomingRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 0.5, gap: 8 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  upcomingLeft: { flex: 1 },
  upcomingParty: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 2 },
  upcomingVoucher: { fontSize: 11, color: '#9CA3AF' },
  upcomingRight: { alignItems: 'flex-end' },
  upcomingAmount: { fontSize: 13, fontWeight: '700', color: '#111827' },
  upcomingDaysLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Recent invoices
  invoiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  invoiceLeft: { flex: 1 },
  invoiceParty: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 2 },
  invoiceVoucher: { fontSize: 11, color: '#9CA3AF' },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceAmount: { fontSize: 13, fontWeight: '700', color: '#059669' },
  invoiceBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5 },
  invoiceBadgeText: { fontSize: 10, fontWeight: '600' },
  divider: { height: 0.5, backgroundColor: '#F3F4F6' },

  // Quick links
  breakdownBtn: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.brandColorLight,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  breakdownBtnText: { fontSize: 13, fontWeight: '600', color: Colors.brandColor },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: '#E5E7EB' },
  quickBtnText: { fontSize: 14, fontWeight: '500', color: Colors.brandColor },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    color: '#000',
  },

  actionBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  badgeProfit: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  badgeLoss: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  badgeTextProfit: {
    color: '#065F46',
  },
  badgeTextLoss: {
    color: '#991B1B',
  },
})

// ─── Table styles (stock overview + grade) ────────────────────────────────────
const st = StyleSheet.create({
  tableCard: {
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
    gap: 4,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowTotal: {
    backgroundColor: '#F9FAFB',
  },
  tableHead: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 7,
  },
  tableHeadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  labelCell: {
    fontWeight: '500',
    color: '#111827',
  },
  right: {
    textAlign: 'right',
  },
  gradePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
})

// ─── Picker styles ─────────────────────────────────────────────────────────────
const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 20 },

  // Year navigation
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 20 },
  yearArrow: { padding: 4 },
  yearArrowDisabled: {},
  yearArrowText: { fontSize: 28, color: '#374151', fontWeight: '300', lineHeight: 32 },
  yearLabel: { fontSize: 22, fontWeight: '700', color: '#111827', minWidth: 70, textAlign: 'center' },

  // Month grid (4 columns)
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  monthBtn: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthBtnActive: { backgroundColor: Colors.brandColor, borderColor: Colors.brandColor },
  monthBtnDisabled: { backgroundColor: '#F3F4F6', borderColor: '#F3F4F6' },
  monthBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  monthBtnTextActive: { color: '#FFFFFF' },
  monthBtnTextDisabled: { color: '#D1D5DB' },

  // Actions
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.brandColor },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})