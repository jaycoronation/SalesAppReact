import { database } from '@/Database'
import PurchaseEntry from '@/Database/models/PurchaseEntry'
import { syncPurchases } from '@/Services/Purchasesync'
import { Colors } from '@/utils/colors'
import { Q } from '@nozbe/watermelondb'
import { Stack, router } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH = 2
const YEAR = 2026
const PAGE_SIZE = 10

const MONTH_NAMES: Record<number, string> = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAmount(val: string | number): string {
    const n = typeof val === 'string' ? parseFloat(val) : val
    if (!n || isNaN(n)) return '—'
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
    return `₹${n.toLocaleString('en-IN')}`
}

// Derive a short category tag from which purchase fields are filled
function getCategory(item: PurchaseEntry): string {
    if (item.rawMaterialPurchase) return 'Raw Material'
    if (item.jobWorkPurchase) return 'Job Work'
    if (item.ssPipePurchase) return 'SS Pipe'
    if (item.consumableStore) return 'Consumable'
    if (item.weldingMaterialExp) return 'Welding'
    if (item.polishingMaterialExp) return 'Polishing'
    if (item.freightInwardExp) return 'Freight'
    return 'Purchase'
}

function getGst(item: PurchaseEntry): string {
    const igst = parseFloat(item.igst18Purchase || '0')
    const cgst9 = parseFloat(item.cgst9Purchase || '0')
    const sgst9 = parseFloat(item.sgst9Purchase || '0')
    const cgst2 = parseFloat(item.cgst25Purchase || '0')
    const sgst2 = parseFloat(item.sgst25Purchase || '0')
    const total = igst + cgst9 + sgst9 + cgst2 + sgst2
    return total > 0 ? formatAmount(total) : '—'
}

// ─── Purchase Card ────────────────────────────────────────────────────────────
function PurchaseCard({ item }: { item: PurchaseEntry }) {
    const category = getCategory(item)
    const gst = getGst(item)

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({
                pathname: '/PurchaseDetailScreen',
                params: { purchaseId: item.purchaseId },
            })}
        >
            <View style={cardStyles.card}>
                {/* Top row: party name + gross total */}
                <View style={cardStyles.topRow}>
                    <Text style={cardStyles.partyName} numberOfLines={1}>
                        {item.partyName}
                    </Text>
                    <Text style={cardStyles.grossTotal}>
                        {formatAmount(item.grossTotal)}
                    </Text>
                </View>

                {/* Voucher + date */}
                <View style={cardStyles.midRow}>
                    <Text style={cardStyles.voucherNo}>{item.voucherNo}</Text>
                    <Text style={cardStyles.txnDate}>{item.txnDate}</Text>
                </View>

                {/* GSTIN */}
                <Text style={cardStyles.gstin}>{item.partyGstin}</Text>

                {/* Bottom row: category tag + GST amount */}
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
export default function PurchaseListScreen() {
    const [entries, setEntries] = useState<PurchaseEntry[]>([])
    const [totalRecords, setTotal] = useState(0)
    const [syncing, setSyncing] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const pageRef = useRef(1)
    const allLoadedRef = useRef(false)

    // ── Load a page from local DB ──────────────────────────────────────────────
    const loadPage = useCallback(async (page: number, replace: boolean) => {
        const collection = database.get<PurchaseEntry>('purchase_entries')

        const records = await collection
            .query(
                Q.where('month', MONTH),
                Q.where('year', YEAR),
                Q.where('page', page),
                Q.sortBy('gross_total', Q.desc),
            )
            .fetch()

        // Total count (only need once — query all pages)
        if (page === 1) {
            const all = await collection
                .query(Q.where('month', MONTH), Q.where('year', YEAR))
                .fetchCount()
            setTotal(all)
            allLoadedRef.current = false
        }

        if (records.length === 0) {
            allLoadedRef.current = true
            return
        }

        setEntries((prev) => (replace ? records : [...prev, ...records]))
    }, [])

    // ── Sync then reload ───────────────────────────────────────────────────────
    const runSync = useCallback(async () => {
        await syncPurchases(MONTH, YEAR)
        pageRef.current = 1
        await loadPage(1, true)
    }, [loadPage])

    // On mount
    useEffect(() => {
        loadPage(1, true)
        setSyncing(true)
        runSync().finally(() => setSyncing(false))
    }, [loadPage, runSync])

    // Pull-to-refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await runSync()
        setRefreshing(false)
    }, [runSync])

    // Infinite scroll — load next page from local DB
    const onEndReached = useCallback(async () => {
        if (loadingMore || allLoadedRef.current) return
        setLoadingMore(true)
        const nextPage = pageRef.current + 1
        pageRef.current = nextPage
        await loadPage(nextPage, false)
        setLoadingMore(false)
    }, [loadingMore, loadPage])

    // ── Empty state ────────────────────────────────────────────────────────────
    if (entries.length === 0 && !syncing) {
        return (
            <View style={styles.emptyContainer}>
                <Stack.Screen options={{ title: 'Purchases', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
                <Text style={styles.emptyText}>No purchases found</Text>
                <Text style={styles.emptyHint}>
                    {MONTH_NAMES[MONTH]} {YEAR}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={runSync}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    if (entries.length === 0 && syncing) {
        return (
            <View style={styles.emptyContainer}>
                <Stack.Screen options={{ title: 'Purchases', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />
                <ActivityIndicator size="large" color={Colors.brandColor} />
                <Text style={styles.emptyText}>Loading purchases…</Text>
                <Text style={styles.emptyHint}>Fetching from local database</Text>
            </View>
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Purchases', headerShown: true, headerBackButtonDisplayMode: "minimal" }} />

            {/* Sticky header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Purchases</Text>
                    <Text style={styles.headerSub}>
                        {MONTH_NAMES[MONTH]} {YEAR} · {totalRecords} records
                    </Text>
                </View>
                {syncing && !refreshing && (
                    <View style={styles.syncBadge}>
                        <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginRight: 6 }} />
                        <Text style={styles.syncText}>Syncing…</Text>
                    </View>
                )}
            </View>

            <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PurchaseCard item={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.4}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.brandColor}
                    />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
        backgroundColor: '#F3F4F6',
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
    listContent: { paddingHorizontal: 16, paddingBottom: 16 },
    footerLoader: { paddingVertical: 20, alignItems: 'center' },
    footer: { height: 32 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', gap: 10 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
    emptyHint: { fontSize: 13, color: '#9CA3AF' },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.brandColor,
        borderRadius: 8,
    },
    retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
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
    partyName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
        marginRight: 8,
    },
    grossTotal: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        flexShrink: 0,
    },
    midRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    voucherNo: {
        fontSize: 12,
        color: Colors.brandColor,
        fontWeight: '500',
    },
    txnDate: {
        fontSize: 12,
        color: '#6B7280',
    },
    gstin: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 10,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryBadge: {
        backgroundColor: Colors.brandColorLight,
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 0.5,
        borderColor: Colors.brandColor,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.brandColor,
    },
    meta: {
        fontSize: 11,
        color: '#6B7280',
        flex: 1,
    },
    gstBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 5,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderWidth: 0.5,
        borderColor: '#E5E7EB',
        marginLeft: 'auto',
    },
    gstLabel: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    gstValue: {
        fontSize: 11,
        fontWeight: '500',
        color: '#374151',
    },
})
