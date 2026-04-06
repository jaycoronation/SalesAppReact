
import React, { useState, useEffect } from 'react';
import {
    Modal,
    Pressable,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { getFinancialYears } from '@/utils/fiscalYear';
import { Colors } from '@/utils/colors';

interface FinancialYearPickerProps {
    visible: boolean;
    selectedFY: string;
    onApply: (fy: string) => void;
    onClose: () => void;
}

export function FinancialYearPicker({
    visible,
    selectedFY,
    onApply,
    onClose,
}: FinancialYearPickerProps) {
    const [selFY, setSelFY] = useState(selectedFY);

    useEffect(() => {
        if (visible) setSelFY(selectedFY);
    }, [visible, selectedFY]);

    const years = getFinancialYears();

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <Pressable style={pk.overlay} onPress={onClose}>
                <Pressable style={pk.sheet} onPress={() => { }}>
                    <View style={pk.handle} />
                    <Text style={pk.sheetTitle}>Select Financial Year</Text>

                    <View style={{ maxHeight: 300 }}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={pk.fyList}>
                                {years.map((fy) => {
                                    const isActive = fy === selFY;
                                    return (
                                        <TouchableOpacity
                                            key={fy}
                                            style={[pk.fyBtn, isActive && pk.fyBtnActive]}
                                            onPress={() => setSelFY(fy)}
                                        >
                                            <Text style={[pk.fyBtnText, isActive && pk.fyBtnTextActive]}>{fy}</Text>
                                        </TouchableOpacity>
                                    );
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
                            onPress={() => { onApply(selFY); onClose(); }}
                        >
                            <Text style={pk.applyBtnText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
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
    fyList: { gap: 10, marginBottom: 24 },
    fyBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    fyBtnActive: { backgroundColor: Colors.brandColor, borderColor: Colors.brandColor },
    fyBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
    fyBtnTextActive: { color: '#FFFFFF' },
    actions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: Colors.brandColor },
    applyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
