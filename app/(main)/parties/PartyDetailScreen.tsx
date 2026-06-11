import { ShimmerBox } from '@/components/Shimmer'
import PartyDetail, {
  PurchaseBillListItem,
  SaleInvoiceListItem,
} from '@/Database/models/Partydetails'
import { ApiEndPoints } from '@/network/ApiEndPoint'
import { loadPartyDetail, syncPartyDetail, updateLocalDueDate } from '@/Services/Partydetailsync'
import { Colors } from '@/utils/colors'
import { SessionManager } from '@/utils/sessionManager'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'

import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'sales' | 'purchases'

type DueDateDialog = {
  visible: boolean
  type: 'sale' | 'purchase'
  id: string
  currentDueDate: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val
  if (!n || isNaN(n)) return '₹0'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

function getStatusStyle(status: string, isOverdue: string) {
  if (isOverdue === '1' && status !== 'paid') {
    return { badge: s.badgeOverdue, text: s.badgeTextOverdue }
  }
  switch (status?.toLowerCase()) {
    case 'paid': return { badge: s.badgePaid, text: s.badgeTextPaid }
    case 'partial': return { badge: s.badgePartial, text: s.badgeTextPartial }
    default: return { badge: s.badgeUnpaid, text: s.badgeTextUnpaid }
  }
}

function getStatusLabel(status: string, isOverdue: string): string {
  if (isOverdue === '1' && status !== 'paid') return 'Overdue'
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unpaid'
}

function getTypeColor(type: string) {
  switch (type) {
    case 'customer': return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
    case 'vendor': return { bg: Colors.brandColorLight, text: Colors.brandColor, border: Colors.brandColor }
    default: return { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' }
  }
}

// ─── API Helpers ──────────────────────────────────────────────────────────────


async function getToken(): Promise<string> {
  const token = await SessionManager.getToken();
  return token ?? ''
}

async function apiUpdateSalesDueDate(saleId: string, dueDateUnix: number): Promise<void> {
  const token = await getToken()
  const body = new URLSearchParams()
  body.append('sale_id', saleId)
  body.append('due_date', String(dueDateUnix))

  const res = await fetch(`${ApiEndPoints.BASE_URL}register/updateSalesDueDate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Server error: ${res.status}`)
}

async function apiUpdatePurchaseDueDate(purchaseId: string, dueDateUnix: number): Promise<void> {
  const token = await getToken()
  const body = new URLSearchParams()
  body.append('purchase_id', purchaseId)
  body.append('due_date', String(dueDateUnix))

  const res = await fetch(`${ApiEndPoints.BASE_URL}register/updatePurchaseDueDate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`Server error: ${res.status}`)
}

async function apiAdjustPayment(params: {
  party_id: string;
  sale_id: string;
  purchase_id: string;
  transfer_purchase_id?: string;
}): Promise<void> {
  try {
    const token = await getToken();

    const body = new URLSearchParams();
    body.append('party_id', params.party_id);
    body.append('sale_id', params.sale_id);
    body.append('purchase_id', params.purchase_id);

    if (params.transfer_purchase_id) {
      body.append('transfer_purchase_id', params.transfer_purchase_id);
    }

    const url = `${ApiEndPoints.BASE_URL}register/adjustPayments`;

    console.log('========== ADJUST PAYMENT API ==========');
    console.log('URL:', url);
    console.log('METHOD:', 'POST');
    console.log('TOKEN:', token);
    console.log('REQUEST PARAMS:', params);
    console.log('REQUEST BODY:', body.toString());

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    console.log('RESPONSE STATUS:', res.status);
    console.log('RESPONSE OK:', res.ok);

    const responseText = await res.text();

    console.log('RAW RESPONSE:', responseText);

    let json;
    try {
      json = JSON.parse(responseText);
      console.log('JSON RESPONSE:', json);
    } catch (e) {
      console.error('Failed to parse response JSON:', e);
      throw new Error('Invalid JSON response from server');
    }

    if (!res.ok || !json.success) {
      console.error('API ERROR:', json.message);
      throw new Error(json.message || `Server error: ${res.status}`);
    }

    console.log('ADJUST PAYMENT SUCCESS');
    console.log('=======================================');
  } catch (error) {
    console.error('ADJUST PAYMENT EXCEPTION:', error);
    throw error;
  }
}

// ─── Adjust Payment Modal ─────────────────────────────────────────────────────

function AdjustPaymentModal({
  visible,
  partyId,
  salesInvoices,
  purchaseBills,
  onClose,
  onSuccess,
}: {
  visible: boolean
  partyId: string
  salesInvoices: SaleInvoiceListItem[]
  purchaseBills: PurchaseBillListItem[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedSaleId, setSelectedSaleId] = useState('')
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('')
  const [transferEnabled, setTransferEnabled] = useState(false)
  const [transferPurchaseId, setTransferPurchaseId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Only show sales that are not fully paid (have outstanding > 0 OR unpaid)
  const eligibleSales = salesInvoices.filter(
    inv => inv.payment_status !== 'paid' || parseFloat(inv.outstanding) > 0,
  )

  const selectedPurchase = purchaseBills.find(b => String(b.purchase_id) === selectedPurchaseId)
  const isSelectedPurchasePartial = selectedPurchase?.payment_status === 'partial'

  // Transfer targets: all purchase bills except the selected one
  const transferablePurchases = purchaseBills.filter(
    b => String(b.purchase_id) !== selectedPurchaseId,
  )

  const handlePurchaseChange = (value: string) => {
    setSelectedPurchaseId(value)
    setTransferEnabled(false)
    setTransferPurchaseId('')
  }

  const handleClose = () => {
    setSelectedSaleId('')
    setSelectedPurchaseId('')
    setTransferEnabled(false)
    setTransferPurchaseId('')
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!selectedSaleId) { setError('Please select a sales invoice.'); return }
    if (!selectedPurchaseId) { setError('Please select a purchase bill.'); return }
    if (transferEnabled && !transferPurchaseId) {
      setError('Please select a bill to transfer remaining payment to.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await apiAdjustPayment({
        party_id: partyId,
        sale_id: selectedSaleId,
        purchase_id: selectedPurchaseId,
        transfer_purchase_id: transferEnabled ? transferPurchaseId : undefined,
      })
      handleClose()
      onSuccess()
    } catch (e: any) {
      setError(e.message || 'Adjustment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (val: string | number) => {
    const n = typeof val === 'string' ? parseFloat(val) : val
    if (!n || isNaN(n)) return '₹0'
    return `₹${n.toLocaleString('en-IN')}`
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'partial': return '#D97706'
      case 'paid': return '#059669'
      default: return Colors.brandColor
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={ap.overlay}>
        <View style={ap.sheet}>
          {/* Header */}
          <View style={ap.header}>
            <View style={ap.headerIconWrap}>
              <Ionicons name="swap-horizontal" size={20} color={Colors.brandColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ap.headerTitle}>Adjust Payment</Text>
              <Text style={ap.headerSub}>Link a sale invoice to a purchase bill</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={ap.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ap.body}>
            {/* Sales Invoice */}
            <View style={ap.fieldGroup}>
              <Text style={ap.fieldLabel}>Sales Invoice</Text>
              <View style={ap.pickerWrap}>
                <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={ap.pickerIcon} />
                <View style={{ flex: 1 }}>
                  {eligibleSales.length === 0 ? (
                    <Text style={ap.emptyNote}>No unpaid / partial sales invoices</Text>
                  ) : (
                    eligibleSales.map(inv => (
                      <TouchableOpacity
                        key={inv.sale_id}
                        style={[ap.optionRow, String(inv.sale_id) === selectedSaleId && ap.optionRowSelected]}
                        onPress={() => setSelectedSaleId(String(inv.sale_id))}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={ap.optionMain}>{inv.voucher_no}</Text>
                          <Text style={ap.optionSub}>
                            {formatCurrency(inv.gross_total)}  ·  Due: {formatCurrency(inv.outstanding)}
                          </Text>
                        </View>
                        {String(inv.sale_id) === selectedSaleId && (
                          <Ionicons name="checkmark-circle" size={18} color={Colors.brandColor} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            </View>

            {/* Purchase Bill */}
            <View style={ap.fieldGroup}>
              <Text style={ap.fieldLabel}>Purchase Bill</Text>
              <View style={ap.pickerWrap}>
                <Ionicons name="receipt-outline" size={16} color="#9CA3AF" style={ap.pickerIcon} />
                <View style={{ flex: 1 }}>
                  {purchaseBills.length === 0 ? (
                    <Text style={ap.emptyNote}>No purchase bills available</Text>
                  ) : (
                    purchaseBills.map(bill => (
                      <TouchableOpacity
                        key={bill.purchase_id}
                        style={[ap.optionRow, String(bill.purchase_id) === selectedPurchaseId && ap.optionRowSelected]}
                        onPress={() => handlePurchaseChange(String(bill.purchase_id))}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={ap.optionMain}>{bill.voucher_no}</Text>
                          <Text style={ap.optionSub}>
                            {formatCurrency(bill.gross_total)}
                            {bill.payment_status === 'partial'
                              ? `  ·  Due: ${formatCurrency(bill.outstanding)}`
                              : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          {String(bill.purchase_id) === selectedPurchaseId && (
                            <Ionicons name="checkmark-circle" size={18} color={Colors.brandColor} />
                          )}
                          <Text style={[ap.statusPill, { color: statusColor(bill.payment_status) }]}>
                            {bill.payment_status}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            </View>

            {/* Transfer toggle — only if partial */}
            {isSelectedPurchasePartial && (
              <View style={ap.fieldGroup}>
                <TouchableOpacity
                  style={ap.checkRow}
                  onPress={() => {
                    setTransferEnabled(v => !v)
                    setTransferPurchaseId('')
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[ap.checkbox, transferEnabled && ap.checkboxChecked]}>
                    {transferEnabled && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={ap.checkLabel}>Transfer remaining to another purchase bill</Text>
                </TouchableOpacity>

                {transferEnabled && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={[ap.fieldLabel, { marginBottom: 6 }]}>Transfer To</Text>
                    <View style={ap.pickerWrap}>
                      <View style={{ flex: 1 }}>
                        {transferablePurchases.length === 0 ? (
                          <Text style={ap.emptyNote}>No other purchase bills available</Text>
                        ) : (
                          transferablePurchases.map(bill => (
                            <TouchableOpacity
                              key={bill.purchase_id}
                              style={[ap.optionRow, String(bill.purchase_id) === transferPurchaseId && ap.optionRowSelected]}
                              onPress={() => setTransferPurchaseId(String(bill.purchase_id))}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={ap.optionMain}>{bill.voucher_no}</Text>
                                <Text style={ap.optionSub}>
                                  {formatCurrency(bill.gross_total)}
                                  {bill.payment_status === 'partial'
                                    ? `  ·  Due: ${formatCurrency(bill.outstanding)}`
                                    : ''}
                                </Text>
                              </View>
                              {String(bill.purchase_id) === transferPurchaseId && (
                                <Ionicons name="checkmark-circle" size={18} color={Colors.brandColor} />
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Error */}
            {!!error && (
              <View style={ap.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.brandColor} />
                <Text style={ap.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={ap.footer}>
            <TouchableOpacity style={ap.cancelBtn} onPress={handleClose} disabled={submitting}>
              <Text style={ap.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ap.submitBtn, submitting && ap.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ap.submitText}>Adjust Payment</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Update Due Date Modal ────────────────────────────────────────────────────

function UpdateDueDateModal({
  dialog,
  partyId,
  onClose,
  onSuccess,
}: {
  dialog: DueDateDialog
  partyId: string   // ← add this
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Try to parse the existing due_date (e.g. "30 Apr 2025" or "2025-04-30")
    const parsed = new Date(dialog.currentDueDate)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  })
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios')
  const [saving, setSaving] = useState(false)

  const isSale = dialog.type === 'sale'
  const accentColor = isSale ? '#059669' : '#D97706'
  const label = isSale ? 'Sales Invoice' : 'Purchase Bill'

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const unixSeconds = Math.floor(selectedDate.getTime() / 1000)
      if (isSale) {
        await apiUpdateSalesDueDate(dialog.id, unixSeconds)
      } else {
        await apiUpdatePurchaseDueDate(dialog.id, unixSeconds)
      }

      // ✅ Optimistically patch the local DB immediately — no full sync delay
      await updateLocalDueDate(partyId, dialog.type, dialog.id, unixSeconds)

      onSuccess()   // still triggers runSync in background to refresh everything else
      onClose()
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update due date. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formattedDate = selectedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Modal
      visible={dialog.visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Header */}
          <View style={ms.sheetHeader}>
            <View style={[ms.sheetIconWrap, { backgroundColor: isSale ? '#ECFDF5' : '#FFF7ED' }]}>
              <Ionicons name="calendar-outline" size={20} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.sheetTitle}>Update Due Date</Text>
              <Text style={ms.sheetSubtitle}>{label}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ms.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Current info */}
          <View style={ms.currentRow}>
            <Text style={ms.currentLabel}>Current due date</Text>
            <Text style={ms.currentValue}>{dialog.currentDueDate || '—'}</Text>
          </View>

          {/* Date picker trigger (Android) */}
          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={[ms.dateDisplayBtn, { borderColor: accentColor }]}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="calendar" size={16} color={accentColor} />
              <Text style={[ms.dateDisplayText, { color: accentColor }]}>{formattedDate}</Text>
              <Ionicons name="chevron-down" size={14} color={accentColor} />
            </TouchableOpacity>
          )}

          {/* Date Picker */}
          {(showPicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowPicker(false)
                if (date) setSelectedDate(date)
              }}
              style={ms.datePicker}
            />
          )}

          {/* iOS: selected date label */}
          {Platform.OS === 'ios' && (
            <View style={ms.iosDateRow}>
              <Text style={ms.iosDateLabel}>Selected:</Text>
              <Text style={[ms.iosDateValue, { color: accentColor }]}>{formattedDate}</Text>
            </View>
          )}

          {/* Footer actions */}
          <View style={ms.actions}>
            <TouchableOpacity style={ms.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={ms.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ms.confirmBtn, { backgroundColor: accentColor }, saving && ms.btnDisabled]}
              onPress={handleConfirm}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={ms.confirmText}>Update</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Summary Stat ─────────────────────────────────────────────────────────────

function Stat({
  label, value, accent,
}: { label: string; value: string; accent?: 'green' | 'red' | 'amber' }) {
  return (
    <View style={s.stat}>
      <Text style={[
        s.statValue,
        accent === 'green' && s.accentGreen,
        accent === 'red' && s.accentRed,
        accent === 'amber' && s.accentAmber,
      ]}>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ─── Sales Invoice Row ────────────────────────────────────────────────────────

function SaleRow({ item, onEditDueDate }: { item: SaleInvoiceListItem; onEditDueDate: () => void }) {
  const st = getStatusStyle(item.payment_status, item.is_overdue)
  const hasOutstanding = parseFloat(item.outstanding) > 0

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.invoiceRow}
      onPress={() =>
        router.push({
          pathname: '/sales/SaleDetailScreen',
          params: { saleId: item.sale_id },
        })
      }
    >
      {/* Left */}
      <View style={s.invoiceLeft}>
        <View style={s.invoiceTopRow}>
          <Text style={s.voucherNo}>{item.voucher_no}</Text>
          {!!item.invoice_type && (
            <View style={s.typePill}>
              <Text style={s.typePillText}>{item.invoice_type}</Text>
            </View>
          )}
        </View>
        <View style={s.dueDateRow}>
          <Text style={s.invoiceDates}>
            {item.txn_date}  ·  Due: {item.due_date}
          </Text>
          <TouchableOpacity
            onPress={onEditDueDate}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.dueDateEditBtn}
          >
            <Ionicons name="calendar-outline" size={13} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right */}
      <View style={s.invoiceRight}>
        <Text style={s.invoiceTotal}>{formatAmount(item.gross_total)}</Text>
        {hasOutstanding && (
          <Text style={s.invoiceOutstanding}>
            Due: {formatAmount(item.outstanding)}
          </Text>
        )}
        <View style={st.badge}>
          <Text style={st.text}>{getStatusLabel(item.payment_status, item.is_overdue)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Purchase Bill Row ────────────────────────────────────────────────────────

function PurchaseRow({ item, onEditDueDate }: { item: PurchaseBillListItem; onEditDueDate: () => void }) {
  const st = getStatusStyle(item.payment_status, item.is_overdue)
  const hasOutstanding = parseFloat(item.outstanding) > 0

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.invoiceRow}
      onPress={() =>
        router.push({
          pathname: '../../purchase/PurchaseDetailScreen',
          params: { purchaseId: item.purchase_id },
        })
      }
    >
      {/* Left */}
      <View style={s.invoiceLeft}>
        <Text style={s.voucherNo}>{item.voucher_no}</Text>
        <View style={s.dueDateRow}>
          <Text style={s.invoiceDates}>
            {item.txn_date}  ·  Due: {item.due_date}
          </Text>
          <TouchableOpacity
            onPress={onEditDueDate}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.dueDateEditBtn}
          >
            <Ionicons name="calendar-outline" size={13} color="#D97706" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right */}
      <View style={s.invoiceRight}>
        <Text style={[s.invoiceTotal, s.purchaseTotal]}>
          {formatAmount(item.gross_total)}
        </Text>
        {hasOutstanding && (
          <Text style={s.invoiceOutstanding}>
            Due: {formatAmount(item.outstanding)}
          </Text>
        )}
        <View style={st.badge}>
          <Text style={st.text}>{getStatusLabel(item.payment_status, item.is_overdue)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Shimmer Loading Layout ──────────────────────────────────────────────────

function ShimmerPartyDetail() {
  return (
    <View style={s.container}>
      <View style={s.content}>
        {/* Hero Card Shimmer */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={s.heroLeft}>
              <ShimmerBox width="70%" height={24} style={{ marginBottom: 8 }} />
              <ShimmerBox width="40%" height={14} />
            </View>
            <ShimmerBox width={80} height={24} borderRadius={6} />
          </View>
          <View style={{ marginTop: 15, gap: 8 }}>
            <ShimmerBox width="50%" height={12} />
            <ShimmerBox width="30%" height={12} />
          </View>
        </View>

        {/* Summary Card Shimmer */}
        <View style={[s.summaryCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: 10 }]}>
          <ShimmerBox width={60} height={14} style={{ marginBottom: 15 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}><ShimmerBox width={60} height={18} /><ShimmerBox width={40} height={10} style={{ marginTop: 4 }} /></View>
            <View style={{ alignItems: 'center' }}><ShimmerBox width={60} height={18} /><ShimmerBox width={40} height={10} style={{ marginTop: 4 }} /></View>
            <View style={{ alignItems: 'center' }}><ShimmerBox width={60} height={18} /><ShimmerBox width={40} height={10} style={{ marginTop: 4 }} /></View>
          </View>
        </View>

        <View style={[s.summaryCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', marginBottom: 15 }]}>
          <ShimmerBox width={60} height={14} style={{ marginBottom: 15 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}><ShimmerBox width={60} height={18} /><ShimmerBox width={40} height={10} style={{ marginTop: 4 }} /></View>
            <View style={{ alignItems: 'center' }}><ShimmerBox width={60} height={18} /><ShimmerBox width={40} height={10} style={{ marginTop: 4 }} /></View>
            <View style={{ alignItems: 'center' }}><ShimmerBox width={60} height={18} /><ShimmerBox width={40} height={10} style={{ marginTop: 4 }} /></View>
          </View>
        </View>

        {/* Tabs Card Shimmer */}
        <View style={s.tabsCard}>
          <View style={[s.tabsHeader, { height: 45 }]}>
            <View style={{ flex: 1, padding: 10 }}><ShimmerBox height={25} /></View>
            <View style={{ flex: 1, padding: 10 }}><ShimmerBox height={25} /></View>
          </View>
          <View style={{ padding: 15, gap: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><ShimmerBox width="60%" height={16} style={{ marginBottom: 6 }} /><ShimmerBox width="40%" height={12} /></View>
              <ShimmerBox width={80} height={20} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><ShimmerBox width="60%" height={16} style={{ marginBottom: 6 }} /><ShimmerBox width="40%" height={12} /></View>
              <ShimmerBox width={80} height={20} />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PartyDetailScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>()

  const [detail, setDetail] = useState<PartyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('sales')
  const [error, setError] = useState<string | null>(null)
  const [dueDateDialog, setDueDateDialog] = useState<DueDateDialog>({
    visible: false,
    type: 'sale',
    id: '',
    currentDueDate: '',
  })
  const [adjustModalVisible, setAdjustModalVisible] = useState(false)

  const openDueDateDialog = useCallback((
    type: 'sale' | 'purchase',
    id: string,
    currentDueDate: string,
  ) => {
    setDueDateDialog({ visible: true, type, id, currentDueDate })
  }, [])

  const closeDueDateDialog = useCallback(() => {
    setDueDateDialog(prev => ({ ...prev, visible: false }))
  }, [])

  const load = useCallback(async () => {
    const cached = await loadPartyDetail(partyId)
    if (cached) setDetail(cached)
  }, [partyId])

  const runSync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      await syncPartyDetail(partyId)
      const fresh = await loadPartyDetail(partyId)
      if (fresh) setDetail(fresh)
    } catch (e: any) {
      setError(e.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [partyId])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load().finally(() => setLoading(false))
      runSync()
    }, [partyId])
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if ((loading || syncing) && !detail) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerBackTitle: '',
            headerTintColor: Colors.brandColor,
            animation: 'none',
            title: 'Loading Party...',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
              </TouchableOpacity>
            ),
          }}
        />
        <ShimmerPartyDetail />
      </>
    )
  }

  if (!detail) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error ?? 'Party not found'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={runSync}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const summary = detail.invoiceSummary
  const salesInvoices = detail.salesInvoices
  const purchaseBills = detail.purchaseBills
  const typeColor = getTypeColor(detail.partyType)

  const salesDue = parseFloat(summary.sales?.amount_due || '0')
  const purchaseDue = parseFloat(summary.purchases?.amount_due || '0')
  const isZeroDue = salesDue === 0 && purchaseDue === 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: '',
          headerTintColor: Colors.brandColor,
          title: detail?.partyName ?? 'Party Detail',
          animation: 'none',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color={Colors.brandColor} />
            </TouchableOpacity>
          ),
          // headerRight: () => (
          //   <TouchableOpacity
          //     style={s.editBtn}
          //     activeOpacity={0.7}
          //     onPress={() =>
          //       router.push({
          //         pathname: '../../parties/PartyUpdateScreen',
          //         params: {
          //           partyId: partyId,
          //           partyName: detail.partyName,
          //           gstinUin: detail.gstinUin ?? '',
          //           partyType: detail.partyType,
          //           address: detail.address ?? '',
          //           email: detail.email ?? '',
          //           phone: detail.phone ?? '',
          //           panNo: detail.panNo ?? '',
          //           isActive: detail.isActive ?? '1',
          //         },
          //       })
          //     }
          //   >
          //     <Text style={s.editBtnText}>✏ Edit</Text>
          //   </TouchableOpacity>
          // ),
        }}
      />

      {/* ── Hero card ──────────────────────────────────────────────────────── */}
      <View style={s.heroCard}>
        <View style={s.heroTop}>
          <View style={s.heroLeft}>
            <Text style={s.partyName}>{detail.partyName} <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '../../parties/PartyUpdateScreen',
                  params: {
                    partyId: partyId,
                    partyName: detail.partyName,
                    gstinUin: detail.gstinUin ?? '',
                    partyType: detail.partyType,
                    address: detail.address ?? '',
                    email: detail.email ?? '',
                    phone: detail.phone ?? '',
                    panNo: detail.panNo ?? '',
                    isActive: detail.isActive ?? '1',
                  },
                })
              }
            >
              <Text style={s.editBtnText}> ✏ </Text>
            </TouchableOpacity></Text>

            {!!detail.gstinUin && (
              <Text style={s.gstin}>{detail.gstinUin}</Text>
            )}

          </View>
          <View style={s.heroRight}>
            <View style={[s.typeBadge, { backgroundColor: typeColor.bg, borderColor: typeColor.border }]}>
              <Text style={[s.typeText, { color: typeColor.text }]}>
                {detail.partyType.charAt(0).toUpperCase() + detail.partyType.slice(1)}
              </Text>

            </View>
            {syncing && <ActivityIndicator size="small" color={Colors.brandColor} style={{ marginTop: 6 }} />}
          </View>
        </View>

        {/* Contact info if available */}
        {(!!detail.phone || !!detail.email || !!detail.address) && (
          <View style={s.contactRow}>
            {!!detail.phone && <Text style={s.contactText}>📞 {detail.phone}</Text>}
            {!!detail.email && <Text style={s.contactText}>✉ {detail.email}</Text>}
            {!!detail.address && <Text style={s.contactText}>📍 {detail.address}</Text>}
          </View>
        )}

        {/* PAN */}
        {!!detail.panNo && (
          <Text style={s.pan}>PAN: {detail.panNo}</Text>
        )}

        {/* Adjust Payment */}
        <TouchableOpacity
          style={s.adjustBtn}
          activeOpacity={0.8}
          onPress={() => setAdjustModalVisible(true)}
        >
          <Ionicons name="swap-horizontal" size={14} color="#fff" />
          <Text style={s.adjustBtnText}>Adjust Payment</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {isZeroDue ? (
        <View style={s.sideBySideRow}>
          {/* Sales Card */}
          <View style={[s.summaryCard, s.summaryCardSales, s.flex1]}>
            <Text style={s.summaryCardTitle}>Invoiced (Sales)</Text>
            <Text style={[s.statValue, s.accentGreen, { fontSize: 16 }]}>
              {formatAmount(summary.sales?.total_invoiced || '0')}
            </Text>
          </View>

          {/* Purchase Card */}
          <View style={[s.summaryCard, s.summaryCardPurchase, s.flex1]}>
            <Text style={s.summaryCardTitle}>Billed (Purchase)</Text>
            <Text style={[s.statValue, s.accentRed, { fontSize: 16 }]}>
              {formatAmount(summary.purchases?.total_billed || '0')}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.summaryRow}>
          {/* Sales summary */}
          <View style={[s.summaryCard, s.summaryCardSales]}>
            <Text style={s.summaryCardTitle}>Sales</Text>
            <View style={s.statsGrid}>
              <Stat label="Invoiced" value={formatAmount(summary.sales?.total_invoiced || '0')} accent="green" />
              <Stat label="Received" value={formatAmount(summary.sales?.amount_received || '0')} />
              <Stat label="Due" value={formatAmount(summary.sales?.amount_due || '0')} accent={salesDue > 0 ? 'red' : undefined} />
              <Stat label="Invoices" value={`${summary.sales?.invoice_count || 0} (${summary.sales?.unpaid_count || 0} unpaid)`} />
            </View>
          </View>

          {/* Purchase summary */}
          <View style={[s.summaryCard, s.summaryCardPurchase]}>
            <Text style={s.summaryCardTitle}>Purchases</Text>
            <View style={s.statsGrid}>
              <Stat label="Billed" value={formatAmount(summary.purchases?.total_billed || '0')} accent="red" />
              <Stat label="Paid" value={formatAmount(summary.purchases?.amount_paid_out || '0')} />
              <Stat label="Due" value={formatAmount(summary.purchases?.amount_due || '0')} accent={purchaseDue > 0 ? 'amber' : undefined} />
              <Stat label="Bills" value={`${summary.purchases?.bill_count || 0} (${summary.purchases?.unpaid_count || 0} unpaid)`} />
            </View>
          </View>
        </View>
      )}

      {/* ── Invoice tabs ───────────────────────────────────────────────────── */}
      <View style={s.tabsCard}>
        {/* Tab headers */}
        <View style={s.tabsHeader}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'sales' && s.tabBtnActive]}
            onPress={() => setActiveTab('sales')}
          >
            <Text style={[s.tabBtnText, activeTab === 'sales' && s.tabBtnTextActive]}>
              Sales ({salesInvoices.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'purchases' && s.tabBtnActive]}
            onPress={() => setActiveTab('purchases')}
          >
            <Text style={[s.tabBtnText, activeTab === 'purchases' && s.tabBtnTextActive]}>
              Purchases ({purchaseBills.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        {activeTab === 'sales' && (
          salesInvoices.length > 0
            ? salesInvoices.map((item, i) => (
              <View key={item.sale_id}>
                <SaleRow
                  item={item}
                  onEditDueDate={() =>
                    openDueDateDialog('sale', String(item.sale_id), item.due_date)
                  }
                />
                {i < salesInvoices.length - 1 && <View style={s.divider} />}
              </View>
            ))
            : <Text style={s.emptyTab}>No sales invoices</Text>
        )}

        {activeTab === 'purchases' && (
          purchaseBills.length > 0
            ? purchaseBills.map((item, i) => (
              <View key={item.purchase_id}>
                <PurchaseRow
                  item={item}
                  onEditDueDate={() =>
                    openDueDateDialog('purchase', String(item.purchase_id), item.due_date)
                  }
                />
                {i < purchaseBills.length - 1 && <View style={s.divider} />}
              </View>
            ))
            : <Text style={s.emptyTab}>No purchase bills</Text>
        )}
      </View>

      <View style={s.footer} />

      {/* ── Update Due Date Modal ───────────────────────────────────────────── */}
      {dueDateDialog.visible && (
        <UpdateDueDateModal
          dialog={dueDateDialog}
          partyId={partyId}         // ← add this
          onClose={closeDueDateDialog}
          onSuccess={runSync}
        />
      )}

      {/* ── Adjust Payment Modal ────────────────────────────────────────────── */}
      <AdjustPaymentModal
        visible={adjustModalVisible}
        partyId={partyId}
        salesInvoices={salesInvoices}
        purchaseBills={purchaseBills}
        onClose={() => setAdjustModalVisible(false)}
        onSuccess={runSync}
      />
    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6' },
  loadingText: { fontSize: 14, color: '#6B7280' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.brandColor, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  footer: { height: 32 },
  editBtn: {
    backgroundColor: Colors.brandColor,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  heroLeft: { flex: 1, marginRight: 12 },
  heroRight: { alignItems: 'flex-end' },
  partyName: { fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  gstin: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5 },
  typeText: { fontSize: 12, fontWeight: '600' },
  contactRow: { gap: 4, marginTop: 4 },
  contactText: { fontSize: 12, color: '#6B7280' },
  pan: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  // ── Summary cards ──────────────────────────────────────────────────────────
  summaryRow: { flexDirection: 'column', gap: 10, marginBottom: 14 },
  sideBySideRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  flex1: { flex: 1 },
  summaryCard: { borderRadius: 12, padding: 12, borderWidth: 0.5 },
  summaryCardSales: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  summaryCardPurchase: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  summaryCardTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { gap: 1, alignItems: 'center', flex: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9CA3AF' },
  accentGreen: { color: '#059669' },
  accentRed: { color: '#DC2626' },
  accentAmber: { color: '#D97706' },

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.brandColor },
  tabBtnText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabBtnTextActive: { color: Colors.brandColor, fontWeight: '600' },
  emptyTab: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 24 },
  divider: { height: 0.5, backgroundColor: '#F3F4F6', marginHorizontal: 14 },

  // ── Invoice / Bill rows ────────────────────────────────────────────────────
  invoiceRow: { flexDirection: 'row', padding: 14, alignItems: 'flex-start', gap: 8 },
  invoiceLeft: { flex: 1 },
  invoiceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  voucherNo: { fontSize: 13, fontWeight: '600', color: Colors.brandColor },
  typePill: {
    backgroundColor: Colors.brandColorLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: Colors.brandColor,
  },
  typePillText: { fontSize: 10, fontWeight: '500', color: Colors.brandColor },
  invoiceDates: { fontSize: 11, color: '#9CA3AF' },
  invoiceRight: { alignItems: 'flex-end', gap: 3 },
  invoiceTotal: { fontSize: 14, fontWeight: '700', color: '#059669' },
  purchaseTotal: { color: '#DC2626' },
  invoiceOutstanding: { fontSize: 11, color: '#D97706', fontWeight: '500' },

  // Status badges
  badgePaid: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#D1FAE5', borderWidth: 0.5, borderColor: '#6EE7B7' },
  badgeUnpaid: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FEE2E2', borderWidth: 0.5, borderColor: '#FECACA' },
  badgePartial: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FEF9C3', borderWidth: 0.5, borderColor: '#FDE68A' },
  badgeOverdue: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: '#FFF7ED', borderWidth: 0.5, borderColor: '#FDBA74' },
  badgeTextPaid: { fontSize: 10, fontWeight: '600', color: '#065F46' },
  badgeTextUnpaid: { fontSize: 10, fontWeight: '600', color: '#991B1B' },
  badgeTextPartial: { fontSize: 10, fontWeight: '600', color: '#92400E' },
  badgeTextOverdue: { fontSize: 10, fontWeight: '600', color: '#C2410C' },

  // ── Due date inline edit ──────────────────────────────────────────────────
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dueDateEditBtn: {
    padding: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },

  // ── Adjust Payment button ─────────────────────────────────────────────────
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: Colors.brandColor,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  adjustBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
})

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sheetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sheetSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  closeBtn: {
    padding: 4,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  currentLabel: { fontSize: 12, color: '#6B7280' },
  currentValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  dateDisplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dateDisplayText: { flex: 1, fontSize: 15, fontWeight: '600' },
  datePicker: { width: '100%' },
  iosDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  iosDateLabel: { fontSize: 13, color: '#6B7280' },
  iosDateValue: { fontSize: 14, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  btnDisabled: { opacity: 0.6 },
})

// ─── Adjust Payment Modal Styles ──────────────────────────────────────────────
const ap = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.brandColorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrap: {
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  pickerIcon: { padding: 12, paddingBottom: 0 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  optionRowSelected: {
    backgroundColor: Colors.brandColorLight,
  },
  optionMain: { fontSize: 13, fontWeight: '600', color: '#111827' },
  optionSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusPill: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  emptyNote: { fontSize: 12, color: '#9CA3AF', padding: 12 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.brandColor,
    borderColor: Colors.brandColor,
  },
  checkLabel: { fontSize: 13, fontWeight: '500', color: '#374151', flex: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brandColorLight,
    borderWidth: 0.5,
    borderColor: Colors.brandColor,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: { fontSize: 12, color: Colors.brandColor, fontWeight: '500', flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.brandColor,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
})