import React, { useState, useEffect } from 'react'
import {
  Modal,
  Pressable,
  TouchableOpacity,
  Text,
  View,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Colors } from '@/utils/colors'
import { getMonthsForFY, MONTH_SHORT } from '@/utils/fiscalYear'

interface MonthYearPickerProps {
  visible: boolean
  month: number
  year: number
  selectedFY: string
  onApply: (month: number, year: number) => void
  onClose: () => void
}

export function MonthYearPicker({
  visible,
  month,
  year,
  selectedFY,
  onApply,
  onClose,
}: MonthYearPickerProps) {
  const [selM, setSelM] = useState(month)
  const [selY, setSelY] = useState(year)

  useEffect(() => {
    if (visible) {
      setSelM(month)
      setSelY(year)
    }
  }, [visible, month, year])

  const months = getMonthsForFY(selectedFY)

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={pk.overlay} onPress={onClose}>
        <Pressable style={pk.sheet} onPress={() => { }}>
          <View style={pk.handle} />
          <Text style={pk.sheetTitle}>Select Month ({selectedFY})</Text>

          <View style={{ maxHeight: 310 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={pk.monthGrid}>
                {months.map((m) => {
                  const isActive = m.month === selM && m.year === selY
                  const d = new Date()
                  const isFuture = m.year > d.getFullYear() || (m.year === d.getFullYear() && m.month > d.getMonth() + 1)

                  return (
                    <TouchableOpacity
                      key={`${m.month}-${m.year}`}
                      style={[
                        pk.monthBtn,
                        isActive && pk.monthBtnActive,
                        isFuture && pk.monthBtnDisabled,
                      ]}
                      onPress={() => !isFuture && (setSelM(m.month), setSelY(m.year))}
                      activeOpacity={isFuture ? 1 : 0.7}
                    >
                      <Text style={[
                        pk.monthBtnText,
                        isActive && pk.monthBtnTextActive,
                        isFuture && pk.monthBtnTextDisabled,
                      ]}>
                        {m.label}
                      </Text>
                      <Text style={[
                        pk.monthYearSubtitle,
                        isActive && pk.monthBtnTextActive,
                        isFuture && pk.monthBtnTextDisabled,
                      ]}>
                        {m.year}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>

          <View style={pk.actions}>
            <TouchableOpacity style={pk.cancelBtn} onPress={onClose}>
              <Text style={pk.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={pk.applyBtn}
              onPress={() => { onApply(selM, selY); onClose() }}
            >
              <Text style={pk.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

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

  // Month grid (4 columns)
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
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
  monthYearSubtitle: { fontSize: 10, marginTop: 2, color: '#9CA3AF' },

  // Actions
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.brandColor },
  applyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})
