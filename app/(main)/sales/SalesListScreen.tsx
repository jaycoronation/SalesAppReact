import { database } from '@/Database'
import SaleEntry from '@/Database/models/SalesEntry'
import { syncSales } from '@/Services/salessync'
import { Colors } from '@/utils/colors'
import { Q } from '@nozbe/watermelondb'
import { Stack, router } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NotificationBell from '@/components/NotificationBell'
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { FinancialYearPicker } from '@/components/FinancialYearPicker'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import {
  getCurrentFY,
  MONTH_SHORT,
} from '@/utils/fiscalYear'
import { SessionManager } from '@/utils/sessionManager'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

type FilterTab = 'all' | 'ogs_sales' | 'ogs_jw' | 'local_12' | 'local'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ogs_sales', label: 'OGS Sales' },
  { key: 'ogs_jw', label: 'OGS JW' },
  { key: 'local_12', label: 'Local 12%' },
  { key: 'local', label: 'Local Sales' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (!n || isNaN(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function getCategory(item: SaleEntry): string {
  if (item.ogsSalesGst) return 'OGS Sales'
  if (item.ogsJwSales18) return 'OGS Job Work'
  if (item.localSalesGst12) return 'Local Sales 12%'
  if (item.localSalesGst) return 'Local Sales'
  return 'Sales'
}

function getGst(item: SaleEntry): string {
  const igst = parseFloat(item.igst18Output || '0')
  const cgst = parseFloat(item.cgst9OnSales || '0')
  const sgst = parseFloat(item.sgst9OnSales || '0')
  const total = igst + cgst + sgst
  return total > 0 ? formatAmount(total) : '—'
}

function matchesTab(item: SaleEntry, tab: FilterTab): boolean {
  switch (tab) {
    case 'ogs_sales': return !!item.ogsSalesGst
    case 'ogs_jw': return !!item.ogsJwSales18
    case 'local_12': return !!item.localSalesGst12
    case 'local': return !!item.localSalesGst && !item.localSalesGst12
    default: return true
  }
}

// ─── Sale Card ────────────────────────────────────────────────────────────────

function SaleCard({ item }: { item: SaleEntry }) {
  const category = getCategory(item)
  const gst = getGst(item)

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '../../sale/SaleDetailScreen',
          params: { saleId: item.saleId },
        })
      }
    >
      <View style={cardStyles.card}>
        {/* Top row */}
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.partyName} numberOfLines={1}>
            {item.partyName}
          </Text>
          <Text style={cardStyles.grossTotal}>{formatAmount(item.grossTotal)}</Text>
        </View>

        {/* Voucher + date */}
        <View style={cardStyles.midRow}>
          <Text style={cardStyles.voucherNo}>{item.voucherNo}</Text>
          <Text style={cardStyles.txnDate}>{item.txnDate}</Text>
        </View>

        {/* GSTIN */}
        <Text style={cardStyles.gstin}>{item.partyGstin}</Text>

        {/* Bottom row */}
        <View style={cardStyles.bottomRow}>
          <View style={cardStyles.categoryBadge}>
            <Text style={cardStyles.categoryText}>{category}</Text>
          </View>
          {item.quantity ? (
            <Text style={cardStyles.meta}>Qty: {item.quantity}</Text>
          ) : null}
          <View style={cardStyles.gstBadge}>
            <Text style={cardStyles.gstLabel}>GST </Text>
            <Text style={cardStyles.gstValue}>{gst}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SalesListScreen() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedFY, setSelectedFY] = useState(getCurrentFY())
  const [fyPickerVisible, setFyPickerVisible] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)

  const [entries, setEntries] = useState<SaleEntry[]>([])
  const [totalRecords, setTotal] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const pageRef = useRef(1)
  const allLoadedRef = useRef(false)

  // ── Load all pages from local DB (we filter in-memory) ────────────────────
  const loadAll = useCallback(async () => {
    const collection = database.get<SaleEntry>('sale_entries')

    const records = await collection
      .query(
        Q.where('month', selectedMonth),
        Q.where('year', selectedYear),
        Q.sortBy('gross_total', Q.desc),
      )
      .fetch()

    setTotal(records.length)
    setEntries(records)
  }, [selectedMonth, selectedYear])

  // ── Load a page (used for infinite scroll when not filtering) ─────────────
  const loadPage = useCallback(async (page: number, replace: boolean) => {
    const collection = database.get<SaleEntry>('sale_entries')

    const records = await collection
      .query(
        Q.where('month', selectedMonth),
        Q.where('year', selectedYear),
        Q.where('page', page),
        Q.sortBy('gross_total', Q.desc),
      )
      .fetch()

    if (page === 1) {
      const all = await collection
        .query(Q.where('month', selectedMonth), Q.where('year', selectedYear))
        .fetchCount()
      setTotal(all)
      allLoadedRef.current = false
    }

    if (records.length === 0) {
      allLoadedRef.current = true
      return
    }

    setEntries((prev) => (replace ? records : [...prev, ...records]))
  }, [selectedMonth, selectedYear])

  // ── Sync then reload ───────────────────────────────────────────────────────
  const runSync = useCallback(async () => {
    await syncSales(selectedMonth, selectedYear)
    pageRef.current = 1
    // If search or filter active, load all; else load page 1
    if (search.trim() || activeTab !== 'all') {
      await loadAll()
    } else {
      await loadPage(1, true)
    }
  }, [loadPage, loadAll, search, activeTab, selectedMonth, selectedYear])

  useEffect(() => {
    const loadInitial = async () => {
      const saved = await SessionManager.getDashFilter();
      if (saved) {
        setSelectedMonth(saved.month);
        setSelectedYear(saved.year);
        setSelectedFY(saved.fy);
      }
    };
    loadInitial();

    const sub = DeviceEventEmitter.addListener('SHARED_FILTER_CHANGED', (data: any) => {
      setSelectedMonth(data.month);
      setSelectedYear(data.year);
      setSelectedFY(data.fy);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    loadPage(1, true)
    setSyncing(true)
    runSync().finally(() => setSyncing(false))
  }, [loadPage, runSync])

  // When search or tab changes, load all records for in-memory filtering
  useEffect(() => {
    if (search.trim() || activeTab !== 'all') {
      loadAll()
    } else {
      // Back to paginated mode
      pageRef.current = 1
      allLoadedRef.current = false
      loadPage(1, true)
    }
  }, [search, activeTab, loadAll, loadPage])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync()
    setRefreshing(false)
  }, [runSync])

  const onEndReached = useCallback(async () => {
    // Disable infinite scroll when filtering
    if (search.trim() || activeTab !== 'all') return
    if (loadingMore || allLoadedRef.current) return
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    await loadPage(nextPage, false)
    setLoadingMore(false)
  }, [loadingMore, loadPage, search, activeTab])

  // ── In-memory filter + search ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = entries

    if (activeTab !== 'all') {
      list = list.filter((item) => matchesTab(item, activeTab))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (item) =>
          item.partyName.toLowerCase().includes(q) ||
          item.voucherNo.toLowerCase().includes(q) ||
          (item.partyGstin ?? '').toLowerCase().includes(q),
      )
    }

    return list
  }, [entries, activeTab, search])

  // ── Loading state ──────────────────────────────────────────────────────────
  const handleFilterApply = useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    SessionManager.setDashFilter(month, year, selectedFY)
    DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month, year, fy: selectedFY })
  }, [selectedFY])

  const handleFYApply = useCallback((fy: string) => {
    setSelectedFY(fy)
    const d = new Date()
    const curFY = getCurrentFY()
    let m = 4, y = parseInt(fy.split('-')[0])
    if (fy === curFY) {
      m = d.getMonth() + 1
      y = d.getFullYear()
    }
    setSelectedMonth(m)
    setSelectedYear(y)
    SessionManager.setDashFilter(m, y, fy)
    DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month: m, year: y, fy })
  }, [])

  if (entries.length === 0 && syncing) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={Colors.brandColor} />
        <Text style={styles.emptyText}>Loading sales…</Text>
        <Text style={styles.emptyHint}>Fetching from local database</Text>
      </View>
    )
  }

  if (entries.length === 0 && !syncing) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sales records found</Text>
        <Text style={styles.emptyHint}>{MONTH_SHORT[selectedMonth]} {selectedYear}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={runSync}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Sales',
          headerShown: true,
          headerBackTitle: '',
          headerBackVisible: true,
          headerTintColor: Colors.brandColor,
          headerRight: () => <NotificationBell />,
        }}
      />

      <FinancialYearPicker
        visible={fyPickerVisible}
        selectedFY={selectedFY}
        onApply={handleFYApply}
        onClose={() => setFyPickerVisible(false)}
      />

      <MonthYearPicker
        visible={pickerVisible}
        month={selectedMonth}
        year={selectedYear}
        selectedFY={selectedFY}
        onApply={handleFilterApply}
        onClose={() => setPickerVisible(false)}
      />


      {/* Sticky header */}
      <View style={styles.header}>
        <View style={styles.headerFilters}>
          <View />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setFyPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterBtnIcon}>📅</Text>
              <Text style={styles.filterBtnText}>{selectedFY}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterBtnText}>
                {MONTH_SHORT[selectedMonth]} {selectedYear}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>Sales</Text>
            <Text style={styles.headerSub}>
              {MONTH_SHORT[selectedMonth]} {selectedYear} ·{' '}
              {search.trim() || activeTab !== 'all'
                ? `${filtered.length} of ${totalRecords}`
                : totalRecords}{' '}
              records
            </Text>
          </View>
          {syncing && !refreshing && (
            <View style={styles.syncBadge}>
              <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
              <Text style={styles.syncText}>Syncing…</Text>
            </View>
          )}
        </View>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search party, voucher or GSTIN…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(t) => t.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SaleCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brandColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No results found</Text>
            <Text style={styles.noResultsHint}>Try a different search or filter</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          ) : (
            <View style={styles.footer} />
          )
        }
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandColorLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: Colors.brandColor,
  },
  syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  headerFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnIcon: { fontSize: 13 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  clearBtn: { fontSize: 13, color: '#9CA3AF', paddingLeft: 8 },

  // Filter tabs (horizontal scroll)
  tabsRow: { gap: 8, paddingBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: '#059669', borderColor: '#059669' },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footer: { height: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9CA3AF' },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.brandColor, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  noResults: { alignItems: 'center', paddingTop: 60, gap: 8 },
  noResultsText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  noResultsHint: { fontSize: 13, color: '#9CA3AF' },
})

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  partyName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  grossTotal: { fontSize: 15, fontWeight: '700', color: '#059669', flexShrink: 0 },
  midRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  voucherNo: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
  txnDate: { fontSize: 12, color: '#6B7280' },
  gstin: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { backgroundColor: '#ECFDF5', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 0.5, borderColor: '#A7F3D0' },
  categoryText: { fontSize: 11, fontWeight: '500', color: '#065F46' },
  meta: { fontSize: 11, color: '#6B7280', flex: 1 },
  gstBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 0.5, borderColor: '#E5E7EB', marginLeft: 'auto' },
  gstLabel: { fontSize: 11, color: '#9CA3AF' },
  gstValue: { fontSize: 11, fontWeight: '500', color: '#374151' },
})