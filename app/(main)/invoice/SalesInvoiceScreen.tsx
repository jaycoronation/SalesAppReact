import { FinancialYearPicker } from '@/components/FinancialYearPicker'
import { MonthYearPicker } from '@/components/MonthYearPicker'
import NotificationBell from '@/components/NotificationBell'
import { ShimmerBox } from '@/components/Shimmer'
import SaleInvoiceEntry from '@/Database/models/SaleInvoiceEntry'
import { InvoiceType, loadSaleInvoices, syncSaleInvoices } from '@/Services/SaleInvoiceSync'
import { Colors } from '@/utils/colors'
import { getCurrentFY, MONTH_SHORT } from '@/utils/fiscalYear'
import { SessionManager } from '@/utils/sessionManager'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    DeviceEventEmitter,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW = new Date()
const TABS: { key: InvoiceType; label: string }[] = [
    { key: 'Sales', label: 'Sales' },
    { key: 'Purchase', label: 'Purchase' },
]

// ── Payment filter chips (labels differ by tab) ───────────────────────────────

type PaymentFilter = 'all' | 'paid' | 'partial' | 'unpaid'

interface ChipDef {
    key: PaymentFilter
    label: string     // display label
    match: string[]   // paymentStatus values that satisfy this chip
}

const SALES_CHIPS: ChipDef[] = [
    { key: 'all', label: 'All', match: [] },
    { key: 'paid', label: 'Received', match: ['paid'] },
    { key: 'partial', label: 'Partial', match: ['partial'] },
    { key: 'unpaid', label: 'Not Received', match: ['unpaid'] },
]

const PURCHASE_CHIPS: ChipDef[] = [
    { key: 'all', label: 'All', match: [] },
    { key: 'paid', label: 'Paid', match: ['paid'] },
    { key: 'partial', label: 'Partial', match: ['partial'] },
    { key: 'unpaid', label: 'Unpaid', match: ['unpaid'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number): string {
    if (!val || isNaN(val)) return '₹0'
    if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`
    if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)} L`
    return `₹${val.toLocaleString('en-IN')}`
}

function nowMonthYear(): { month: number; year: number } {
    const d = new Date()
    return { month: d.getMonth() + 1, year: d.getFullYear() }
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; border: string; text: string }> = {
    paid: { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
    partial: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
    unpaid: { bg: '#FEF9C3', border: '#FDE68A', text: '#92400E' },
}
const OVERDUE_STATUS_CFG = { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' }

// ─── Invoice Row ──────────────────────────────────────────────────────────────

function InvoiceRow({ item, type }: { item: SaleInvoiceEntry, type: string }) {
    const isOD = item.isOverdue === '1'
    const stt =
        isOD && item.paymentStatus !== 'paid'
            ? OVERDUE_STATUS_CFG
            : STATUS_CFG[item.paymentStatus] ?? STATUS_CFG.unpaid

    const daysLabel =
        item.paymentStatus === 'paid'
            ? 'Paid'
            : isOD
                ? item.daysOverdue === '0' ? 'Due today' : `${item.daysOverdue}d overdue`
                : item.daysUntil === '0' ? 'Due today' : `${item.daysUntil}d left`

    const typeColor = item.invoiceType === 'OGS' ? '#7C3AED' : '#0369A1'
    const typeBg = item.invoiceType === 'OGS' ? '#EDE9FE' : '#E0F2FE'

    const amountColor =
        item.paymentStatus === 'paid' ? '#059669' : isOD ? '#DC2626' : '#2563EB'

    return (
        <TouchableOpacity
            activeOpacity={0.75}
            style={s.row}
            onPress={() =>
                router.push({
                    pathname: type === 'Sales' ? '/sales/SaleDetailScreen' : '/purchase/PurchaseDetailScreen',
                    params: type === 'Sales' ? { saleId: item.saleId } : { purchaseId: item.saleId },
                })
            }
        >
            {/* Left */}
            <View style={s.rowLeft}>
                <View style={s.rowTop}>
                    <Text style={s.partyName} numberOfLines={1}>
                        {item.partyName}
                    </Text>
                    <View style={[s.badge, { backgroundColor: stt.bg, borderColor: stt.border }]}>
                        <Text style={[s.badgeText, { color: stt.text }]}>
                            {isOD && item.paymentStatus !== 'paid' ? 'Overdue' : item.statusDisplay}
                        </Text>
                    </View>
                </View>

                <View style={s.rowMeta}>
                    <Text style={[s.voucherNo, { color: amountColor }]}>{item.voucherNo}</Text>
                    <View style={[s.typePill, { backgroundColor: typeBg }]}>
                        <Text style={[s.typePillText, { color: typeColor }]}>{item.invoiceType}</Text>
                    </View>
                </View>

                <Text style={s.dates}>
                    {item.txnDate} · Due: {item.dueDate}
                </Text>
            </View>

            {/* Right */}
            <View style={s.rowRight}>
                <Text
                    style={[
                        s.outstanding,
                        {
                            color:
                                item.paymentStatus === 'paid'
                                    ? '#059669'
                                    : isOD
                                        ? '#DC2626'
                                        : '#6B7280',
                        },
                    ]}
                >
                    {fmt(Number.parseFloat(item.grossTotal))} total
                </Text>
                <Text style={[s.grossTotal, { color: amountColor }]}>
                    {fmt(Number.parseFloat(item.outstanding))}
                </Text>
                <Text
                    style={[
                        s.daysLabel,
                        {
                            color:
                                item.paymentStatus === 'paid'
                                    ? '#059669'
                                    : isOD
                                        ? '#DC2626'
                                        : '#6B7280',
                        },
                    ]}
                >
                    {daysLabel}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

// ─── Shimmer Loading ──────────────────────────────────────────────────────────

function ShimmerInvoiceList() {
    return (
        <View style={s.container}>
            <View style={s.header}>
                <View style={s.headerFilters}>
                    <View />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ShimmerBox width={80} height={30} borderRadius={20} />
                        <ShimmerBox width={100} height={30} borderRadius={20} />
                    </View>
                </View>
                <View style={[s.viewSummary, { marginHorizontal: 12 }]}>
                    <View style={s.viewSummaryLeft}>
                        <ShimmerBox width={100} height={14} style={{ marginBottom: 4 }} />
                        <ShimmerBox width={60} height={10} />
                    </View>
                    <View style={s.viewSummaryRight}>
                        <ShimmerBox width={80} height={18} style={{ marginBottom: 4 }} />
                        <ShimmerBox width={50} height={10} />
                    </View>
                </View>
            </View>
            <View style={{ paddingHorizontal: 12, gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={[s.row, { padding: 12 }]}>
                        <View style={s.rowLeft}>
                            <ShimmerBox width="70%" height={16} style={{ marginBottom: 8 }} />
                            <ShimmerBox width="40%" height={12} style={{ marginBottom: 8 }} />
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

// ─── Filter Chips ─────────────────────────────────────────────────────────────

function FilterChips({
    chips,
    active,
    onSelect,
    counts,
}: {
    chips: ChipDef[]
    active: PaymentFilter
    onSelect: (f: PaymentFilter) => void
    counts: Record<PaymentFilter, number>
}) {
    return (
        <View style={s.chipsRow}>
            {chips.map((chip) => {
                const isActive = active === chip.key
                const count = counts[chip.key]
                return (
                    <TouchableOpacity
                        key={chip.key}
                        style={[s.chip, isActive && s.chipActive]}
                        onPress={() => onSelect(chip.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.chipText, isActive && s.chipTextActive]}>
                            {chip.label}
                        </Text>
                        {count > 0 && (
                            <Text style={[s.chipCount, isActive && s.chipCountActive]}>
                                {count}
                            </Text>
                        )}
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
    activeTab,
    onTabChange,
    salesCount,
    purchaseCount,
}: {
    activeTab: InvoiceType
    onTabChange: (tab: InvoiceType) => void
    salesCount: number
    purchaseCount: number
}) {
    const counts: Record<InvoiceType, number> = { Sales: salesCount, Purchase: purchaseCount }

    return (
        <View style={s.tabBar}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.key
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[s.tabItem, isActive && s.tabItemActive]}
                        onPress={() => onTabChange(tab.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                            {tab.label}
                        </Text>
                        {counts[tab.key] > 0 && (
                            <View style={[s.tabBadge, isActive && s.tabBadgeActive]}>
                                <Text style={[s.tabBadgeText, isActive && s.tabBadgeTextActive]}>
                                    {counts[tab.key]}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SalesInvoiceScreen() {
    // ── Filter state ──────────────────────────────────────────────────────────
    const [month, setMonth] = useState<number>(NOW.getMonth() + 1)
    const [year, setYear] = useState<number>(NOW.getFullYear())
    const [selectedFY, setSelectedFY] = useState(getCurrentFY())
    const [isFilterLoaded, setIsFilterLoaded] = useState(false)

    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<InvoiceType>('Sales')
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

    // ── Data state (one per tab) ───────────────────────────────────────────────
    const [salesEntries, setSalesEntries] = useState<SaleInvoiceEntry[]>([])
    const [purchaseEntries, setPurchaseEntries] = useState<SaleInvoiceEntry[]>([])
    const [syncingSales, setSyncingSales] = useState(false)
    const [syncingPurchase, setSyncingPurchase] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // ── UI state ──────────────────────────────────────────────────────────────
    const [isFYPickerVisible, setFYPickerVisible] = useState(false)
    const [pickerVisible, setPickerVisible] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchVisible, setIsSearchVisible] = useState(false)

    // ── Derived: active entries ───────────────────────────────────────────────
    const entries = activeTab === 'Sales' ? salesEntries : purchaseEntries
    const syncing = activeTab === 'Sales' ? syncingSales : syncingPurchase

    // ── Derived: active chips config ──────────────────────────────────────────
    const chips = activeTab === 'Sales' ? SALES_CHIPS : PURCHASE_CHIPS

    const filteredEntries = useMemo(() => {
        let result = entries
        // payment status filter
        if (paymentFilter !== 'all') {
            const chip = chips.find((c) => c.key === paymentFilter)
            if (chip) result = result.filter((e) => chip.match.includes(e.paymentStatus))
        }
        // text search
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(
                (e) =>
                    e.partyName.toLowerCase().includes(q) ||
                    e.voucherNo.toLowerCase().includes(q),
            )
        }
        return result
    }, [entries, paymentFilter, searchQuery, chips])

    // per-chip counts (based on entries before text search, for UX clarity)
    const chipCounts = useMemo((): Record<PaymentFilter, number> => {
        const all = entries.length
        const count = (statuses: string[]) =>
            entries.filter((e) => statuses.includes(e.paymentStatus)).length
        return {
            all,
            paid: count(['paid']),
            partial: count(['partial']),
            unpaid: count(['unpaid']),
        }
    }, [entries])

    const totalOutstanding = useMemo(
        () => entries.reduce((sum, r) => sum + Number.parseFloat(r.outstanding || '0'), 0),
        [entries],
    )

    // ── Data loaders ──────────────────────────────────────────────────────────
    const loadLocal = useCallback(
        async (m: number, y: number, type: InvoiceType) => {
            const rows = await loadSaleInvoices(m, y, type)
            if (type === 'Sales') setSalesEntries(rows)
            else setPurchaseEntries(rows)
        },
        [],
    )

    const runSync = useCallback(
        async (m: number, y: number, type: InvoiceType) => {
            if (type === 'Sales') setSyncingSales(true)
            else setSyncingPurchase(true)
            try {
                await syncSaleInvoices(m, y, type)
                await loadLocal(m, y, type)
            } finally {
                if (type === 'Sales') setSyncingSales(false)
                else setSyncingPurchase(false)
            }
        },
        [loadLocal],
    )

    const loadAll = useCallback(
        (m: number, y: number) => {
            loadLocal(m, y, 'Sales')
            loadLocal(m, y, 'Purchase')
            runSync(m, y, 'Sales')
            runSync(m, y, 'Purchase')
        },
        [loadLocal, runSync],
    )

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        const loadInitial = async () => {
            const saved = await SessionManager.getDashFilter()
            if (saved) {
                setMonth(saved.month)
                setYear(saved.year)
                setSelectedFY(saved.fy)
                loadAll(saved.month, saved.year)
            } else {
                const { month: m, year: y } = nowMonthYear()
                setMonth(m)
                setYear(y)
                loadAll(m, y)
            }
            setIsFilterLoaded(true)
        }

        loadInitial()

        const sub = DeviceEventEmitter.addListener('SHARED_FILTER_CHANGED', (data) => {
            setMonth(data.month)
            setYear(data.year)
            setSelectedFY(data.fy)
            loadAll(data.month, data.year)
        })

        return () => sub.remove()
    }, [loadAll])

    // ── Refresh ───────────────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        if (!isFilterLoaded) return
        setRefreshing(true)
        await Promise.all([runSync(month, year, 'Sales'), runSync(month, year, 'Purchase')])
        setRefreshing(false)
    }, [runSync, month, year, isFilterLoaded])

    // ── Filter handlers ───────────────────────────────────────────────────────
    const handleFilterApply = useCallback(
        (m: number, y: number) => {
            setMonth(m)
            setYear(y)
            SessionManager.setDashFilter(m, y, selectedFY)
            DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month: m, year: y, fy: selectedFY })
            loadAll(m, y)
        },
        [loadAll, selectedFY],
    )

    const handleFYApply = useCallback(
        (fy: string) => {
            setSelectedFY(fy)
            const curFY = getCurrentFY()
            const d = new Date()
            let m = 4
            let y = parseInt(fy.split('-')[0])
            if (fy === curFY) {
                m = d.getMonth() + 1
                y = d.getFullYear()
            }
            setMonth(m)
            setYear(y)
            SessionManager.setDashFilter(m, y, fy)
            DeviceEventEmitter.emit('SHARED_FILTER_CHANGED', { month: m, year: y, fy })
            loadAll(m, y)
        },
        [loadAll],
    )

    // ── Tab change — clear search + filter ───────────────────────────────────
    const handleTabChange = useCallback((tab: InvoiceType) => {
        setActiveTab(tab)
        setSearchQuery('')
        setPaymentFilter('all')
    }, [])

    // ── List header ───────────────────────────────────────────────────────────
    const ListHeader = (
        <View style={s.header}>
            {/* Month & FY filters */}
            <View style={s.headerFilters}>
                <View />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                        style={s.filterBtn}
                        onPress={() => setFYPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={s.filterBtnIcon}>📅</Text>
                        <Text style={s.filterBtnText}>{selectedFY}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.filterBtn}
                        onPress={() => setPickerVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={s.filterBtnText}>
                            {MONTH_SHORT[month]} {year}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <TabBar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                salesCount={salesEntries.length}
                purchaseCount={purchaseEntries.length}
            />

            {/* Payment filter chips */}
            <FilterChips
                chips={chips}
                active={paymentFilter}
                onSelect={setPaymentFilter}
                counts={chipCounts}
            />

            {/* Search bar */}
            {isSearchVisible && (
                <View style={s.searchRow}>
                    <View style={s.searchBox}>
                        <Ionicons
                            name="search-outline"
                            size={18}
                            color="#9CA3AF"
                            style={{ marginRight: 8 }}
                        />
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search party or invoice no..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                            autoFocus
                        />
                    </View>
                </View>
            )}

            {/* Summary bar */}
            <View style={s.viewSummary}>
                <View style={s.viewSummaryLeft}>
                    <Text style={s.viewSummaryLabel}>Total Outstanding</Text>
                    <Text style={s.viewSummarySub}>
                        {activeTab} · {chips.find((c) => c.key === paymentFilter)?.label ?? 'All'} · {MONTH_SHORT[month]} {year}
                    </Text>
                </View>
                <View style={s.viewSummaryRight}>
                    <Text style={s.viewSummaryAmount}>{fmt(totalOutstanding)}</Text>
                    <Text style={s.viewSummaryCount}>{filteredEntries.length} items found</Text>
                </View>
            </View>
        </View>
    )

    // ── Loading (initial, no cached data yet) ─────────────────────────────────
    if (entries.length === 0 && syncing && !refreshing) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: 'Invoices',
                        headerBackTitle: '',
                        headerShown: true,
                        headerTintColor: Colors.brandColor,
                    }}
                />
                <ShimmerInvoiceList />
            </>
        )
    }

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <View style={s.container}>
            <Stack.Screen
                options={{
                    title: 'Invoices',
                    headerBackTitle: '',
                    headerTintColor: Colors.brandColor,
                    headerShown: true,
                    headerBackVisible: true,
                    headerRight: () => (
                        <View
                            style={{
                                marginRight: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 16,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    if (isSearchVisible) setSearchQuery('')
                                    setIsSearchVisible(!isSearchVisible)
                                }}
                            >
                                <Ionicons
                                    name={isSearchVisible ? 'close-circle-outline' : 'search-outline'}
                                    size={24}
                                    color={Colors.brandColor}
                                />
                            </TouchableOpacity>
                            <NotificationBell color={Colors.brandColor} />
                        </View>
                    ),
                }}
            />

            <FinancialYearPicker
                visible={isFYPickerVisible}
                selectedFY={selectedFY}
                onApply={handleFYApply}
                onClose={() => setFYPickerVisible(false)}
            />

            <MonthYearPicker
                visible={pickerVisible}
                month={month}
                year={year}
                selectedFY={selectedFY}
                onApply={handleFilterApply}
                onClose={() => setPickerVisible(false)}
            />

            <FlatList
                data={filteredEntries}
                keyExtractor={(item) => `${activeTab}-${item.id}`}
                renderItem={({ item }) => <InvoiceRow item={item} type={activeTab} />}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.brandColor}
                    />
                }
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyIcon}>📄</Text>
                        <Text style={s.emptyText}>No {activeTab.toLowerCase()} invoices</Text>
                        <Text style={s.emptyHint}>Pull down to refresh</Text>
                    </View>
                }
                ListFooterComponent={<View style={{ height: 40 }} />}
            />
        </View>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    listContent: { paddingHorizontal: 8, paddingTop: 4 },

    // ── Header ────────────────────────────────────────────────────────────────
    header: { paddingTop: 4, paddingBottom: 4 },

    headerFilters: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginBottom: 8,
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

    // ── Tab Bar ───────────────────────────────────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 8,
        marginBottom: 10,
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        padding: 3,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    tabItemActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    tabLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    tabLabelActive: { color: Colors.brandColor },
    tabBadge: {
        backgroundColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeActive: { backgroundColor: `${Colors.brandColor}18` },
    tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
    tabBadgeTextActive: { color: Colors.brandColor },

    // ── Filter Chips ──────────────────────────────────────────────────────────
    chipsRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        gap: 6,
        marginBottom: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    chipActive: {
        backgroundColor: Colors.brandColor,
        borderColor: Colors.brandColor,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
    chipTextActive: { color: '#FFFFFF' },
    chipCount: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        overflow: 'hidden',
    },
    chipCountActive: {
        color: Colors.brandColor,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    searchRow: { paddingHorizontal: 12, paddingBottom: 10 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

    // ── View Summary ─────────────────────────────────────────────────────────
    viewSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    viewSummaryLeft: { flexDirection: 'column', alignItems: 'flex-start', gap: 2, flex: 1 },
    viewSummaryLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
    viewSummarySub: { fontSize: 11, color: '#6B7280' },
    viewSummaryRight: { alignItems: 'flex-end', gap: 2 },
    viewSummaryAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
    viewSummaryCount: { fontSize: 11, color: '#6B7280' },

    // ── Invoice Row ───────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 6,
        borderWidth: 0.5,
        borderColor: '#E5E7EB',
        alignItems: 'flex-start',
        gap: 8,
    },
    rowLeft: { flex: 1 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    partyName: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        flexShrink: 0,
    },
    badgeText: { fontSize: 10, fontWeight: '600' },

    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    voucherNo: { fontSize: 12, fontWeight: '500' },
    typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typePillText: { fontSize: 10, fontWeight: '700' },
    dates: { fontSize: 11, color: '#9CA3AF' },

    rowRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0, paddingTop: 2 },
    outstanding: { fontSize: 14, fontWeight: '700' },
    grossTotal: { fontSize: 11, color: '#9CA3AF' },
    daysLabel: { fontSize: 11, fontWeight: '500' },

    // ── Empty ─────────────────────────────────────────────────────────────────
    empty: { alignItems: 'center', paddingTop: 48, gap: 6 },
    emptyIcon: { fontSize: 32 },
    emptyText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
    emptyHint: { fontSize: 12, color: '#D1D5DB' },
})