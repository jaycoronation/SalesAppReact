import { SessionManager } from '@/utils/sessionManager';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const status = await SessionManager.getIsLoggedIn();
            setIsLoggedIn(status);
        };
        checkSession();
    }, []);

    if (isLoggedIn === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return isLoggedIn ? <Redirect href="/(main)/dashboard/BottomNavigation" /> : <Redirect href="/(auth)/login" />;
}