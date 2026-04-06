import { getApps, initializeApp } from '@react-native-firebase/app';
import { Platform } from 'react-native';

// Firebase configuration from native config files
const firebaseConfig = Platform.select({
    ios: {
        apiKey: 'AIzaSyAVdBGzoPIo36VFjHgWrO_GLaYbin9Z3hc',
        appId: '1:306606999279:ios:e6f565823d11915bfc7d1a',
        projectId: 'sps-velocity',
        messagingSenderId: '306606999279',
        storageBucket: 'sps-velocity.firebasestorage.app',
        databaseURL: 'https://sps-velocity-default-rtdb.firebaseio.com',
    },
    android: {
        apiKey: 'AIzaSyBLlXM2y04PVOLIvCB_rzr06_U2B_nRrUk',
        appId: '1:306606999279:android:8d17f1f0184db0f7fc7d1a',
        projectId: 'sps-velocity',
        messagingSenderId: '306606999279',
        storageBucket: 'sps-velocity.firebasestorage.app',
        databaseURL: 'https://sps-velocity-default-rtdb.firebaseio.com',
    },
});

let isInitializing = false;

/**
 * Initializes Firebase if it hasn't been initialized yet.
 */
export function initFirebase() {
    if (getApps().length > 0) return;
    if (isInitializing) return;

    isInitializing = true;
    try {
        console.log('[Firebase] Initializing manual fallback for', Platform.OS);
        if (firebaseConfig) {
            initializeApp(firebaseConfig);
            console.log('[Firebase] Manual initialization successful.');
        }
    } catch (error: any) {
        if (error.message?.includes('already been configured')) {
            console.log('[Firebase] Detected existing configuration.');
        } else {
            console.error('[Firebase] Initialization error:', error);
        }
    } finally {
        isInitializing = false;
    }
}
