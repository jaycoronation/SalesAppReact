import { ApiEndPoints } from '@/network/ApiEndPoint';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ShimmerBox } from '@/components/Shimmer';
import { Colors } from '@/utils/colors';
import { getCurrentFY, MONTH_SHORT } from '@/utils/fiscalYear';
import { SessionManager } from '@/utils/sessionManager';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesBreakdown {
  ogs_sales_gst: number;
  local_sales_gst: number;
  local_sales_gst_12: number;
  ogs_jw_sales_18: number;
  pf_charge: number;
  total: number;
}

interface PurchaseBreakdown {
  raw_material_purchase: number;
  ss_pipe_purchase: number;
  job_work_purchase: number;
  packing_material_exp: number;
  welding_material_exp: number;
  polishing_material_exp: number;
  repairing_maintenance: number;
  pf_charges: number;
  total: number;
}

interface DirectExpBreakdown {
  electric_power_exp: number;
  freight_charges: number;
  freight_inward_exp: number;
  pf_employer_contrib: number;
  wages_salary_exp: number;
}

interface IndirectExpBreakdown {
  finance_cost: number;
  legal_consulting_fees: number;
  commission_exp: number;
  conveyance_exp: number;
  internet_comm_exp: number;
  kasar_vatav: number;
  membership_subscription: number;
  misc_exp: number;
  office_exp: number;
  petrol_diesel_exp: number;
  postage_courier_exp: number;
  staff_traveling_exp: number;
  staff_welfare_exp: number;
  transportation_exp: number;
}

interface PLSummary {
  total_sales: number;
  opening_stock: number;
  total_purchase: number;
  closing_stock: number;
  cogs: number;
  gross_profit: number;
  total_direct_exp: number;
  total_indirect_exp: number;
  net_pl: number;
  is_profit: string;
}

interface PLData {
  month: number;
  year: number;
  period: { from: number; to: number };
  stock: { opening_stock: number; closing_stock: number };
  sales: { breakdown: SalesBreakdown; total: number };
  purchase: { breakdown: PurchaseBreakdown; total: number };
  direct_expenses: { breakdown: DirectExpBreakdown; total: number };
  indirect_expenses: { breakdown: IndirectExpBreakdown; total: number };
  summary: PLSummary;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined): string {
  const n = val ?? 0;
  if (!n || isNaN(n)) return '₹0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function toLabel(key: string): string {
  return key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  total,
  totalLabel,
  totalColor,
  children,
  accent,
}: {
  title: string;
  total: number;
  totalLabel?: string;
  totalColor?: string;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <View style={[sc.card, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <View style={sc.cardHeader}>
        <Text style={sc.cardTitle}>{title}</Text>
        <View style={[sc.totalBadge, { backgroundColor: accent + '18' }]}>
          <Text style={[sc.totalBadgeText, { color: accent }]}>
            {totalLabel ?? 'Total'}: {fmt(total)}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function BreakdownRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: number;
  isLast?: boolean;
}) {
  return (
    <View style={[sc.row, isLast && sc.rowLast]}>
      <Text style={sc.rowLabel}>{label}</Text>
      <Text style={sc.rowValue}>{fmt(value)}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
  isBold,
  isTotal,
}: {
  label: string;
  value: number;
  valueColor?: string;
  isBold?: boolean;
  isTotal?: boolean;
}) {
  return (
    <View style={[sm.row, isTotal && sm.totalRow]}>
      <Text style={[sm.label, isBold && sm.bold]}>{label}</Text>
      <Text style={[sm.value, isBold && sm.bold, valueColor ? { color: valueColor } : {}]}>
        {fmt(value)}
      </Text>
    </View>
  );
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────

function ShimmerScreen() {
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <ShimmerBox height={90} borderRadius={12} />
        <ShimmerBox height={220} borderRadius={12} />
        <ShimmerBox height={260} borderRadius={12} />
        <ShimmerBox height={180} borderRadius={12} />
        <ShimmerBox height={180} borderRadius={12} />
        <ShimmerBox height={260} borderRadius={12} />
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfitLossBreakdownScreen() {
  const params = useLocalSearchParams();

  const [selectedMonth, setSelectedMonth] = useState(
    params.month ? parseInt(params.month as string) : new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(
    params.year ? parseInt(params.year as string) : new Date().getFullYear(),
  );
  const [selectedFY] = useState((params.fy as string) || getCurrentFY());

  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SessionManager.getToken();
      const url = `${ApiEndPoints.DASHBOARD_PROFIT_LOSS}?month=${selectedMonth}&year=${selectedYear}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('P&L fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleFilterApply = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  }, []);

  const headerOptions = {
    title: 'P&L Breakdown',
    headerShown: true,
    headerBackTitle: '',
    headerTintColor: Colors.brandColor,
    animation: 'none' as const,
    headerLeft: () => (
      <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
        <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
      </TouchableOpacity>
    ),
  };

  if (loading && !refreshing) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <ShimmerScreen />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={s.empty}>
          <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>No data for this period</Text>
        </View>
      </>
    );
  }

  const { stock, sales, purchase, direct_expenses, indirect_expenses, summary } = data;
  const isProfit = summary.is_profit === 'Yes';

  // ── Sales breakdown rows
  const salesRows: { label: string; value: number }[] = [
    { label: 'OGS Sales (GST 18%)', value: sales.breakdown.ogs_sales_gst },
    { label: 'Local Sales (GST)', value: sales.breakdown.local_sales_gst },
    { label: 'Local Sales (GST 12%)', value: sales.breakdown.local_sales_gst_12 },
    { label: 'OGS Job Work Sales (18%)', value: sales.breakdown.ogs_jw_sales_18 },
    { label: 'P&F Charges', value: sales.breakdown.pf_charge },
  ];

  // ── Purchase breakdown rows
  const purchaseRows: { label: string; value: number }[] = [
    { label: 'Raw Material Purchase', value: purchase.breakdown.raw_material_purchase },
    { label: 'SS Pipe Purchase', value: purchase.breakdown.ss_pipe_purchase },
    { label: 'Job Work Purchase', value: purchase.breakdown.job_work_purchase },
    { label: 'Packing Material Exp', value: purchase.breakdown.packing_material_exp },
    { label: 'Welding Material Exp', value: purchase.breakdown.welding_material_exp },
    { label: 'Polishing Material Exp', value: purchase.breakdown.polishing_material_exp },
    { label: 'Repairing & Maintenance', value: purchase.breakdown.repairing_maintenance },
    { label: 'P&F Charges', value: purchase.breakdown.pf_charges },
  ];

  // ── Direct expense rows
  const directRows = Object.entries(direct_expenses.breakdown).map(([k, v]) => ({
    label: toLabel(k),
    value: v as number,
  }));

  // ── Indirect expense rows
  const indirectRows = Object.entries(indirect_expenses.breakdown).map(([k, v]) => ({
    label: toLabel(k),
    value: v as number,
  }));

  return (
    <View style={s.container}>
      <Stack.Screen options={headerOptions} />

      <MonthYearPicker
        visible={pickerVisible}
        month={selectedMonth}
        year={selectedYear}
        selectedFY={selectedFY}
        onApply={handleFilterApply}
        onClose={() => setPickerVisible(false)}
      />

      {/* ── Filter strip ─────────────────────────────────────────────── */}
      <View style={s.filterStrip}>
        <TouchableOpacity
          style={s.filterBtn}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={14} color="#374151" />
          <Text style={s.filterBtnText}>
            {MONTH_SHORT[selectedMonth]} {selectedYear}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Net P&L banner */}
        <View style={[s.plBanner, { backgroundColor: isProfit ? '#D1FAE5' : '#FEE2E2' }]}>
          <Ionicons
            name={isProfit ? 'trending-up' : 'trending-down'}
            size={14}
            color={isProfit ? '#059669' : '#DC2626'}
          />
          <Text style={[s.plBannerText, { color: isProfit ? '#065F46' : '#991B1B' }]}>
            {isProfit ? 'Net Profit' : 'Net Loss'}: {fmt(summary.net_pl)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.brandColor}
          />
        }
      >

        {/* ── Stock ──────────────────────────────────────────────────── */}
        <View style={[sc.card, { borderLeftColor: '#6366F1', borderLeftWidth: 3 }]}>
          <Text style={sc.cardTitle}>Stock</Text>
          <View style={stk.row}>
            <View style={stk.box}>
              <Text style={stk.boxLabel}>Opening Stock</Text>
              <Text style={stk.boxValue}>{fmt(stock.opening_stock)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#9CA3AF" style={{ marginTop: 12 }} />
            <View style={stk.box}>
              <Text style={stk.boxLabel}>Closing Stock</Text>
              <Text style={[stk.boxValue, { color: '#6366F1' }]}>{fmt(stock.closing_stock)}</Text>
            </View>
          </View>
        </View>

        {/* ── Sales ─────────────────────────────────────────────────── */}
        <SectionCard
          title="Sales"
          total={sales.total}
          accent="#059669"
        >
          {salesRows.map((r, i) => (
            <BreakdownRow
              key={r.label}
              label={r.label}
              value={r.value}
              isLast={i === salesRows.length - 1}
            />
          ))}
        </SectionCard>

        {/* ── Purchase ──────────────────────────────────────────────── */}
        <SectionCard
          title="Purchase"
          total={purchase.total}
          accent="#DC2626"
        >
          {purchaseRows.map((r, i) => (
            <BreakdownRow
              key={r.label}
              label={r.label}
              value={r.value}
              isLast={i === purchaseRows.length - 1}
            />
          ))}
        </SectionCard>

        {/* ── Direct Expenses ───────────────────────────────────────── */}
        <SectionCard
          title="Direct Expenses"
          total={direct_expenses.total}
          accent="#F59E0B"
        >
          {directRows.map((r, i) => (
            <BreakdownRow
              key={r.label}
              label={r.label}
              value={r.value}
              isLast={i === directRows.length - 1}
            />
          ))}
        </SectionCard>

        {/* ── Indirect Expenses ─────────────────────────────────────── */}
        <SectionCard
          title="Indirect Expenses"
          total={indirect_expenses.total}
          accent="#8B5CF6"
        >
          {indirectRows.map((r, i) => (
            <BreakdownRow
              key={r.label}
              label={r.label}
              value={r.value}
              isLast={i === indirectRows.length - 1}
            />
          ))}
        </SectionCard>

        {/* ── P&L Summary ───────────────────────────────────────────── */}
        <View style={sm.card}>
          <View style={sm.titleRow}>
            <Ionicons
              name={isProfit ? 'trending-up' : 'trending-down'}
              size={18}
              color={isProfit ? '#059669' : '#DC2626'}
            />
            <Text style={sm.title}>Profit & Loss Summary</Text>
          </View>

          <SummaryRow label="Total Sales" value={summary.total_sales} valueColor="#059669" />
          <SummaryRow label="Opening Stock" value={summary.opening_stock} />
          <SummaryRow label="Total Purchase" value={summary.total_purchase} valueColor="#DC2626" />
          <SummaryRow label="Closing Stock" value={summary.closing_stock} />

          <View style={sm.divider} />
          <SummaryRow
            label="Cost of Goods Sold (COGS)"
            value={summary.cogs}
            isBold
            valueColor="#DC2626"
          />
          <SummaryRow
            label="Gross Profit / Loss"
            value={summary.gross_profit}
            isBold
            valueColor={summary.gross_profit >= 0 ? '#059669' : '#DC2626'}
          />

          <View style={sm.divider} />
          <SummaryRow label="Total Direct Expenses" value={summary.total_direct_exp} valueColor="#F59E0B" />
          <SummaryRow label="Total Indirect Expenses" value={summary.total_indirect_exp} valueColor="#8B5CF6" />

          <View style={sm.divider} />
          {/* Net P&L highlighted row */}
          <View style={[sm.netRow, { backgroundColor: isProfit ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[sm.netLabel, { color: isProfit ? '#065F46' : '#991B1B' }]}>
              {isProfit ? '▲ Net Profit' : '▼ Net Loss'}
            </Text>
            <Text style={[sm.netValue, { color: isProfit ? '#059669' : '#DC2626' }]}>
              {fmt(summary.net_pl)}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { padding: 16, gap: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  plBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  plBannerText: { fontSize: 12, fontWeight: '700' },
});

// Section card styles
const sc = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  totalBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  totalBadgeText: { fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 12, color: '#6B7280', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 12, fontWeight: '600', color: '#374151' },
});

// Stock section styles
const stk = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 4 },
  box: { alignItems: 'center', flex: 1 },
  boxLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  boxValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
});

// Summary styles
const sm = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F9FAFB',
  },
  totalRow: { backgroundColor: '#F9FAFB' },
  label: { fontSize: 12, color: '#6B7280', flex: 1 },
  value: { fontSize: 12, fontWeight: '600', color: '#374151' },
  bold: { fontWeight: '700', color: '#111827', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 6 },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  netLabel: { fontSize: 15, fontWeight: '700' },
  netValue: { fontSize: 17, fontWeight: '800' },
});