// src/screens/SplashScreen.tsx
import { Colors } from '@/utils/colors';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StatusBar,
    StyleSheet
} from 'react-native';

const { width } = Dimensions.get('window');

interface Props {
    onFinish: () => void;
}

const SplashScreen = ({ onFinish }: Props) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const ringAnim = useRef(new Animated.Value(0)).current;
    const screenFade = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Logo pop-in
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 5,
            useNativeDriver: true,
        }).start();

        // 2. Text fade up
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            delay: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();

        // 3. Ring pulse loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(ringAnim, {
                    toValue: 1,
                    duration: 1400,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(ringAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 4. After 2.5s → fade out entire splash → call onFinish
        const timer = setTimeout(() => {
            Animated.timing(screenFade, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start(() => onFinish());
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.8] });
    const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
    const textY = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

    return (
        <Animated.View style={[styles.container, { opacity: screenFade }]}>
            <StatusBar backgroundColor={Colors.brandColor} barStyle="light-content" />

            {/* Ring 1 */}
            <Animated.View style={[
                styles.ring,
                { transform: [{ scale: ringScale }], opacity: ringOpacity }
            ]} />

            {/* Ring 2 — delayed */}
            <Animated.View style={[
                styles.ring,
                {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                }
            ]} />

            {/* Logo */}
            <Animated.View style={[styles.logoCircle, { transform: [{ scale: scaleAnim }] }]}>
                <Image
                    source={require('@/assets/images/icon.png')} // ← your logo
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* App name */}
            <Animated.Text style={[
                styles.appName,
                { opacity: fadeAnim, transform: [{ translateY: textY }] }
            ]}>
                SPS Sales
            </Animated.Text>

            {/* Tagline */}
            <Animated.Text style={[
                styles.tagline,
                { opacity: fadeAnim, transform: [{ translateY: textY }] }
            ]}>
                Loading your experience...
            </Animated.Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.brandColor,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    ring: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.45)',
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    logo: {
        width: 60,
        height: 60,
    },
    appName: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '500',
        letterSpacing: 1.5,
        marginTop: 8,
    },
    tagline: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
});

export default SplashScreen;