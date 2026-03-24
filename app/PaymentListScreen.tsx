import { database } from '@/Database'
import PaymentEntry from '@/Database/models/PaymentEntry'
import { syncPayments } from '@/Services/paymentSync'
import { Colors } from '@/utils/colors'
import { Q } from '@nozbe/watermelondb'
import { Stack } from 'expo-router'
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

const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: number): string {
  if (!val || isNaN(val)) return '—'
  if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`
  if (val >= 1e5) return `₹${(val / 1e5).toFixed(1)} L`
  return `₹${val.toLocaleString('en-IN')}`
}

function getModeLabel(mode: string): string {
  if (!mode) return 'Payment'
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

// ─── Payment Card ─────────────────────────────────────────────────────────────

function PaymentCard({ item }: { item: PaymentEntry }) {
  const isDebit = item.debitAmount > 0
  const amount = isDebit ? item.debitAmount : item.creditAmount
  const modeLabel = getModeLabel(item.paymentMode)
  const hasParty = !!item.partyName
  const hasGstin = !!item.partyGstin
  const hasVchNo = !!item.vchNo

  return (
    <View style={cardStyles.card}>
      {/* Top row: particulars + amount */}
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.particulars} numberOfLines={1}>
          {item.particulars || '—'}
        </Text>
        <Text style={[cardStyles.amount, isDebit ? cardStyles.debit : cardStyles.credit]}>
          {isDebit ? '−' : '+'}{formatAmount(amount)}
        </Text>
      </View>

      {/* Party name if different from particulars */}
      {hasParty && item.partyName !== item.particulars && (
        <Text style={cardStyles.partyName} numberOfLines={1}>
          {item.partyName}
        </Text>
      )}

      {/* Voucher no + date */}
      <View style={cardStyles.midRow}>
        {hasVchNo
          ? <Text style={cardStyles.vchNo}>{item.vchNo}</Text>
          : <Text style={cardStyles.vchNoEmpty}>No voucher no.</Text>
        }
        <Text style={cardStyles.txnDate}>{item.txnDate}</Text>
      </View>

      {/* GSTIN if available */}
      {hasGstin && (
        <Text style={cardStyles.gstin}>{item.partyGstin}</Text>
      )}

      {/* Bottom row: mode badge + bank account */}
      <View style={cardStyles.bottomRow}>
        <View style={[
          cardStyles.modeBadge,
          item.paymentMode === 'bank' ? cardStyles.modeBadgeBank : cardStyles.modeBadgeCash,
        ]}>
          <Text style={[
            cardStyles.modeText,
            item.paymentMode === 'bank' ? cardStyles.modeTextBank : cardStyles.modeTextCash,
          ]}>
            {modeLabel}
          </Text>
        </View>
        {item.bankAccount ? (
          <Text style={cardStyles.bankAccount} numberOfLines={1}>
            {item.bankAccount}
          </Text>
        ) : null}
        <View style={[cardStyles.typeBadge, isDebit ? cardStyles.typeBadgeDebit : cardStyles.typeBadgeCredit]}>
          <Text style={[cardStyles.typeText, isDebit ? cardStyles.typeTextDebit : cardStyles.typeTextCredit]}>
            {isDebit ? 'Debit' : 'Credit'}
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PaymentListScreen() {
  const [entries, setEntries] = useState<PaymentEntry[]>([])
  const [totalRecords, setTotal] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const pageRef = useRef(1)
  const allLoadedRef = useRef(false)

  // ── Load a page from local DB ──────────────────────────────────────────────
  const loadPage = useCallback(async (page: number, replace: boolean) => {
    const collection = database.get<PaymentEntry>('payment_entries')

    const records = await collection
      .query(
        Q.where('month', MONTH),
        Q.where('year', YEAR),
        Q.where('page', page),
        Q.sortBy('txn_date', Q.desc),
      )
      .fetch()

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
    await syncPayments(MONTH, YEAR)
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

  // Infinite scroll
  const onEndReached = useCallback(async () => {
    if (loadingMore || allLoadedRef.current) return
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    await loadPage(nextPage, false)
    setLoadingMore(false)
  }, [loadingMore, loadPage])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (entries.length === 0 && syncing) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={{ title: 'Payments' }} />
        <ActivityIndicator size="large" color={Colors.brandColor} />
        <Text style={styles.emptyText}>Loading payments…</Text>
        <Text style={styles.emptyHint}>Fetching from local database</Text>
      </View>
    )
  }

  if (entries.length === 0 && !syncing) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={{ title: 'Payments' }} />
        <Text style={styles.emptyText}>No payments found</Text>
        <Text style={styles.emptyHint}>{MONTH_NAMES[MONTH]} {YEAR}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={runSync}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Payments' }} />

      {/* Sticky header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Payments</Text>
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
        renderItem={({ item }) => <PaymentCard item={item} />}
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
    marginBottom: 3,
  },
  particulars: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 0,
  },
  debit: { color: '#DC2626' },   // red for money going out
  credit: { color: '#059669' },   // green for money coming in
  partyName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
  },
  midRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  vchNo: { fontSize: 12, color: Colors.brandColor, fontWeight: '500' },
  vchNoEmpty: { fontSize: 12, color: '#D1D5DB', fontStyle: 'italic' },
  txnDate: { fontSize: 12, color: '#6B7280' },
  gstin: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  // Payment mode badge
  modeBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 0.5,
  },
  modeBadgeBank: { backgroundColor: Colors.brandColorLight, borderColor: Colors.brandColor },
  modeBadgeCash: { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' },
  modeText: { fontSize: 11, fontWeight: '500' },
  modeTextBank: { color: '#1D4ED8' },
  modeTextCash: { color: '#92400E' },
  bankAccount: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  // Debit / Credit type badge
  typeBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 0.5,
    marginLeft: 'auto',
  },
  typeBadgeDebit: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  typeBadgeCredit: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  typeText: { fontSize: 11, fontWeight: '500' },
  typeTextDebit: { color: '#991B1B' },
  typeTextCredit: { color: '#065F46' },
})
