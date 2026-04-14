import NotificationBell from '@/components/NotificationBell'
import { ShimmerBox } from '@/components/Shimmer'
import Party from '@/Database/models/Party'
import { loadParties, syncParties } from '@/Services/Partysync'
import { Colors } from '@/utils/colors'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'customer' | 'vendor' | 'both'

export interface PartyFilters {
  partyType: FilterTab
  hasOverdue: boolean        // has outstanding dues
  hasSalesActivity: boolean  // has at least 1 invoice
  hasPurchaseActivity: boolean // has at least 1 bill
  minDue: 'any' | '10k' | '1L' | '10L' // minimum total due amount
}

const DEFAULT_FILTERS: PartyFilters = {
  partyType: 'all',
  hasOverdue: false,
  hasSalesActivity: false,
  hasPurchaseActivity: false,
  minDue: 'any',
}

function filtersActive(f: PartyFilters): boolean {
  return (
    f.partyType !== 'all' ||
    f.hasOverdue ||
    f.hasSalesActivity ||
    f.hasPurchaseActivity ||
    f.minDue !== 'any'
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (!n || isNaN(n)) return '₹0'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function getTypeColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'customer': return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
    case 'vendor': return { bg: Colors.brandColorLight, text: Colors.brandColor, border: Colors.brandColor }
    default: return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' }
  }
}

// ─── Filter Bottom Sheet ──────────────────────────────────────────────────────

function FilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean
  filters: PartyFilters
  onApply: (f: PartyFilters) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<PartyFilters>(filters)
  const slideAnim = useRef(new Animated.Value(400)).current
  const backdropAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      setLocal(filters)
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  const set = <K extends keyof PartyFilters>(key: K, val: PartyFilters[K]) =>
    setLocal((prev) => ({ ...prev, [key]: val }))

  const reset = () => setLocal(DEFAULT_FILTERS)

  const apply = () => {
    onApply(local)
    onClose()
  }

  const partyTypes: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'customer', label: 'Customer' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'both', label: 'Both' },
  ]

  const minDueOptions: { key: PartyFilters['minDue']; label: string }[] = [
    { key: 'any', label: 'Any' },
    { key: '10k', label: '> ₹10K' },
    { key: '1L', label: '> ₹1L' },
    { key: '10L', label: '> ₹10L' },
  ]

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[fs.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[fs.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={fs.handle} />

        {/* Title row */}
        <View style={fs.titleRow}>
          <Text style={fs.title}>Filter Parties</Text>
          <TouchableOpacity onPress={reset} style={fs.resetBtn}>
            <Text style={fs.resetText}>Reset all</Text>
          </TouchableOpacity>
        </View>

        {/* ── Party Type ─────────────────────────────────────────────── */}
        <Text style={fs.sectionLabel}>PARTY TYPE</Text>
        <View style={fs.chipRow}>
          {partyTypes.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[fs.chip, local.partyType === t.key && fs.chipActive]}
              onPress={() => set('partyType', t.key)}
            >
              <Text style={[fs.chipText, local.partyType === t.key && fs.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Minimum Due ────────────────────────────────────────────── */}
        <Text style={fs.sectionLabel}>MINIMUM DUE AMOUNT</Text>
        <View style={fs.chipRow}>
          {minDueOptions.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[fs.chip, local.minDue === o.key && fs.chipActive]}
              onPress={() => set('minDue', o.key)}
            >
              <Text style={[fs.chipText, local.minDue === o.key && fs.chipTextActive]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Activity Filters ───────────────────────────────────────── */}
        <Text style={fs.sectionLabel}>ACTIVITY</Text>
        <View style={fs.toggleList}>
          <ToggleRow
            label="Has sales invoices"
            sub="At least one invoice raised"
            value={local.hasSalesActivity}
            onChange={(v) => set('hasSalesActivity', v)}
          />
          <ToggleRow
            label="Has purchase bills"
            sub="At least one bill received"
            value={local.hasPurchaseActivity}
            onChange={(v) => set('hasPurchaseActivity', v)}
          />
          <ToggleRow
            label="Has overdue amount"
            sub="Outstanding dues > ₹0"
            value={local.hasOverdue}
            onChange={(v) => set('hasOverdue', v)}
            last
          />
        </View>

        {/* ── Apply ──────────────────────────────────────────────────── */}
        <TouchableOpacity style={fs.applyBtn} onPress={apply} activeOpacity={0.85}>
          <Text style={fs.applyText}>Apply Filters</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  )
}

function ToggleRow({
  label, sub, value, onChange, last = false,
}: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void; last?: boolean
}) {
  return (
    <TouchableOpacity
      style={[fs.toggleRow, last && fs.toggleRowLast]}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <View style={fs.toggleLeft}>
        <Text style={fs.toggleLabel}>{label}</Text>
        <Text style={fs.toggleSub}>{sub}</Text>
      </View>
      <View style={[fs.toggle, value && fs.toggleOn]}>
        <View style={[fs.toggleThumb, value && fs.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  )
}

// ─── Party Card ───────────────────────────────────────────────────────────────

function PartyCard({ item }: { item: Party }) {
  const details = item.invoiceDetails
  const sales = details?.sales
  const purchases = details?.purchases
  const typeColor = getTypeColor(item.partyType)

  const hasSales = parseInt(sales?.invoice_count ?? '0') > 0
  const hasPurchases = parseInt(purchases?.bill_count ?? '0') > 0

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={cardStyles.card}
      onPress={() =>
        router.push({
          pathname: '../../parties/PartyDetailScreen',
          params: { partyId: item.partyId },
        })
      }
    >
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.partyName} numberOfLines={1}>{item.partyName}</Text>
        <View style={[cardStyles.typeBadge, { backgroundColor: typeColor.bg, borderColor: typeColor.border }]}>
          <Text style={[cardStyles.typeText, { color: typeColor.text }]}>
            {item.partyType.charAt(0).toUpperCase() + item.partyType.slice(1)}
          </Text>
        </View>
      </View>

      {!!item.gstinUin && (
        <Text style={cardStyles.gstin}>{item.gstinUin}</Text>
      )}

      <View style={cardStyles.summaryRow}>
        {hasSales && (
          <View style={cardStyles.summaryBlock}>
            <Text style={cardStyles.summaryLabel}>Sales</Text>
            <Text style={cardStyles.summaryValue}>{formatAmount(sales?.total_invoiced ?? '0')}</Text>
            <Text style={cardStyles.summaryMeta}>
              {sales?.invoice_count ?? 0} inv · Due: {formatAmount(sales?.amount_due ?? '0')}
            </Text>
          </View>
        )}
        {hasSales && hasPurchases && <View style={cardStyles.summaryDivider} />}
        {hasPurchases && (
          <View style={cardStyles.summaryBlock}>
            <Text style={cardStyles.summaryLabel}>Purchases</Text>
            <Text style={[cardStyles.summaryValue, cardStyles.purchaseValue]}>
              {formatAmount(purchases?.total_billed ?? '0')}
            </Text>
            <Text style={cardStyles.summaryMeta}>
              {purchases?.bill_count ?? 0} bills · Due: {formatAmount(purchases?.amount_due ?? '0')}
            </Text>
          </View>
        )}
        {!hasSales && !hasPurchases && (
          <Text style={cardStyles.noActivity}>No activity</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Shimmer Loading Layout ──────────────────────────────────────────────────

function ShimmerPartyList() {
  return (
    <View style={s.container}>
      {/* Header Shimmer */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <ShimmerBox width={120} height={24} />
          <View style={s.headerRight}>
            <ShimmerBox width={80} height={30} borderRadius={20} />
          </View>
        </View>
      </View>

      {/* List Shimmer */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={cardStyles.card}>
            <View style={cardStyles.topRow}>
              <ShimmerBox width="60%" height={16} />
              <ShimmerBox width={60} height={18} borderRadius={5} />
            </View>
            <ShimmerBox width="40%" height={12} style={{ marginTop: 4, marginBottom: 15 }} />
            <View style={cardStyles.summaryRow}>
              <View style={cardStyles.summaryBlock}>
                <ShimmerBox width={40} height={10} style={{ marginBottom: 4 }} />
                <ShimmerBox width={80} height={16} style={{ marginBottom: 4 }} />
                <ShimmerBox width="90%" height={11} />
              </View>
              <View style={cardStyles.summaryDivider} />
              <View style={cardStyles.summaryBlock}>
                <ShimmerBox width={40} height={10} style={{ marginBottom: 4 }} />
                <ShimmerBox width={80} height={16} style={{ marginBottom: 4 }} />
                <ShimmerBox width="90%" height={11} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartyListScreen() {
  const [allParties, setAllParties] = useState<Party[]>([])
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [filters, setFilters] = useState<PartyFilters>(DEFAULT_FILTERS)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const loadLocal = useCallback(async () => {
    const records = await loadParties()
    setAllParties(records)
  }, [])

  const runSync = useCallback(async () => {
    await syncParties()
    await loadLocal()
  }, [loadLocal])

  useEffect(() => {
    loadLocal()
    setSyncing(true)
    runSync().finally(() => setSyncing(false))
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await runSync()
    setRefreshing(false)
  }, [runSync])

  // ── Filter + search ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allParties

    // Tab / partyType filter
    if (filters.partyType !== 'all') {
      list = list.filter((p) => p.partyType === filters.partyType)
    }

    // Sales activity
    if (filters.hasSalesActivity) {
      list = list.filter((p) => {
        const count = parseInt(p.invoiceDetails?.sales?.invoice_count ?? '0')
        return count > 0
      })
    }

    // Purchase activity
    if (filters.hasPurchaseActivity) {
      list = list.filter((p) => {
        const count = parseInt(p.invoiceDetails?.purchases?.bill_count ?? '0')
        return count > 0
      })
    }

    // Has overdue
    if (filters.hasOverdue) {
      list = list.filter((p) => {
        const salesDue = parseFloat(p.invoiceDetails?.sales?.amount_due ?? '0')
        const purchaseDue = parseFloat(p.invoiceDetails?.purchases?.amount_due ?? '0')
        return salesDue > 0 || purchaseDue > 0
      })
    }

    // Min due amount
    if (filters.minDue !== 'any') {
      const thresholds = { '10k': 10000, '1L': 100000, '10L': 1000000 }
      const threshold = thresholds[filters.minDue]
      list = list.filter((p) => {
        const salesDue = parseFloat(p.invoiceDetails?.sales?.amount_due ?? '0')
        const purchaseDue = parseFloat(p.invoiceDetails?.purchases?.amount_due ?? '0')
        return salesDue + purchaseDue >= threshold
      })
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.partyName.toLowerCase().includes(q) ||
          p.gstinUin.toLowerCase().includes(q),
      )
    }

    return list
  }, [allParties, filters, search])

  const isFiltered = filtersActive(filters)

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'customer', label: 'Customers' },
    { key: 'vendor', label: 'Vendors' },
    { key: 'both', label: 'Both' },
  ]

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (allParties.length === 0 && syncing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Parties', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
        <ShimmerPartyList />
      </>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Parties',
          headerBackVisible: true,
          headerTintColor: Colors.brandColor,

          headerRight: () => (
            <View style={{ marginRight: 12, flexDirection: 'row', alignItems: 'center' }}>
              <NotificationBell color={Colors.brandColor} />
              <TouchableOpacity onPress={() => setIsSearchVisible(!isSearchVisible)}>
                <Ionicons name="search" size={22} color={Colors.brandColor} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Header */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <View>
            {/* <Text style={s.title}>Parties</Text> */}
            {/* <Text style={s.subtitle}>{filtered.length} of {allParties.length} records</Text> */}
          </View>
          <View style={s.headerRight}>
            {syncing && !refreshing && (
              <View style={s.syncBadge}>
                <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
                <Text style={s.syncText}>Syncing…</Text>
              </View>
            )}
            {/* Filter button */}
            <TouchableOpacity
              style={[s.filterBtn, isFiltered && s.filterBtnActive]}
              onPress={() => setSheetVisible(true)}
            >
              <Text style={s.filterIcon}>⚙</Text>
              <Text style={[s.filterBtnText, isFiltered && s.filterBtnTextActive]}>
                Filter{isFiltered ? ' •' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        {isSearchVisible && <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name or GSTIN…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>}

        {/* Filter tabs */}
        {/* <View style={s.tabsRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, filters.partyType === tab.key && s.tabActive]}
              onPress={() => setFilters((prev) => ({ ...prev, partyType: tab.key }))}
            >
              <Text style={[s.tabText, filters.partyType === tab.key && s.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View> */}

        {/* Active filter pills */}
        {isFiltered && (
          <View style={s.activePillsRow}>
            {filters.hasOverdue && (
              <View style={s.activePill}>
                <Text style={s.activePillText}>Has overdue</Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, hasOverdue: false }))}>
                  <Text style={s.activePillX}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {filters.hasSalesActivity && (
              <View style={s.activePill}>
                <Text style={s.activePillText}>Has sales</Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, hasSalesActivity: false }))}>
                  <Text style={s.activePillX}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {filters.hasPurchaseActivity && (
              <View style={s.activePill}>
                <Text style={s.activePillText}>Has purchases</Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, hasPurchaseActivity: false }))}>
                  <Text style={s.activePillX}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {filters.minDue !== 'any' && (
              <View style={s.activePill}>
                <Text style={s.activePillText}>
                  Due {filters.minDue === '10k' ? '> ₹10K' : filters.minDue === '1L' ? '> ₹1L' : '> ₹10L'}
                </Text>
                <TouchableOpacity onPress={() => setFilters((p) => ({ ...p, minDue: 'any' }))}>
                  <Text style={s.activePillX}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)} style={s.clearAllBtn}>
              <Text style={s.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PartyCard item={item} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brandColor} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No parties found</Text>
            <Text style={s.emptyHint}>
              {isFiltered ? 'Try adjusting your filters' : 'Try a different search'}
            </Text>
            {isFiltered && (
              <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)} style={s.clearFiltersBtn}>
                <Text style={s.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={<View style={s.footer} />}
      />

      {/* Filter Bottom Sheet */}
      <FilterSheet
        visible={sheetVisible}
        filters={filters}
        onApply={setFilters}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280' },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  footer: { height: 120 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9CA3AF' },
  clearFiltersBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.brandColor, borderRadius: 8 },
  clearFiltersText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  header: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brandColorLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: Colors.brandColor },
  syncText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },

  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E5E7EB' },
  filterBtnActive: { backgroundColor: Colors.brandColorLight, borderColor: Colors.brandColor },
  filterIcon: { fontSize: 13 },
  filterBtnText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterBtnTextActive: { color: Colors.brandColor },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 0.5, borderColor: '#E5E7EB', marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  clearBtn: { fontSize: 13, color: '#9CA3AF', paddingLeft: 8 },

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: Colors.brandColor, borderColor: Colors.brandColor },
  tabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  // Active filter pills
  activePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.brandColorLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: Colors.brandColor },
  activePillText: { fontSize: 11, fontWeight: '500', color: Colors.brandColor },
  activePillX: { fontSize: 10, color: Colors.brandColor, fontWeight: '700' },
  clearAllBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#FEE2E2', borderWidth: 0.5, borderColor: '#FECACA' },
  clearAllText: { fontSize: 11, fontWeight: '600', color: '#DC2626' },
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  partyName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 0.5, flexShrink: 0 },
  typeText: { fontSize: 11, fontWeight: '500' },
  gstin: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  summaryBlock: { flex: 1 },
  summaryDivider: { width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 12, alignSelf: 'stretch' },
  summaryLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#059669', marginBottom: 2 },
  purchaseValue: { color: '#DC2626' },
  summaryMeta: { fontSize: 11, color: '#6B7280' },
  noActivity: { fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' },
})

// ─── Filter Sheet Styles ──────────────────────────────────────────────────────
const fs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, backgroundColor: '#FEE2E2', borderWidth: 0.5, borderColor: '#FECACA' },
  resetText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: Colors.brandColorLight,
    borderColor: Colors.brandColor,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  chipTextActive: { color: Colors.brandColor, fontWeight: '600' },

  toggleList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLeft: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 13, fontWeight: '500', color: '#111827', marginBottom: 2 },
  toggleSub: { fontSize: 11, color: '#9CA3AF' },

  // Toggle switch
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: Colors.brandColor },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  applyBtn: {
    backgroundColor: Colors.brandColor,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})