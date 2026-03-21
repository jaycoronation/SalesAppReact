import { SessionManager } from '@/utils/sessionManager';
import {
    BottomSheetModal
} from '@gorhom/bottom-sheet';
import type { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { router } from 'expo-router';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type LogoutSheetRef = BottomSheetModalMethods;

const LogoutSheet = forwardRef<LogoutSheetRef>((_, ref) => {
    const snapPoints = useMemo(() => ['25%'], []);

    const handleLogout = useCallback(() => {
        SessionManager.clearSession();
        (ref as React.RefObject<LogoutSheetRef>)?.current?.close();
        router.replace('/login');
    }, [ref]);

    return (
        <BottomSheetModal
            ref={ref}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={({ style }) => (
                <View style={[style, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            )}
        >
            <View style={styles.container}>
                <Text style={styles.title}>
                    Are you sure you want to logout?
                </Text>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() =>
                        (ref as React.RefObject<LogoutSheetRef>)?.current?.close()
                    }
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </BottomSheetModal>
    );
});

export default LogoutSheet;

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 16,
        marginBottom: 20,
    },
    logoutBtn: {
        backgroundColor: 'red',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    logoutText: {
        color: '#fff',
        textAlign: 'center',
    },
    cancelBtn: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    cancelText: {
        textAlign: 'center',
    },
});