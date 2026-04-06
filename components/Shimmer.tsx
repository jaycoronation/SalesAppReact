import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

/**
 * Reusable shimmer animation hook.
 * Returns an Animated.Value that loops between 0 and 1.
 */
export function useShimmerAnim() {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [anim]);

    return anim;
}

interface ShimmerBoxProps {
    width?: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
    color?: string;
}

/**
 * A simple animated box for creating shimmer layouts.
 */
export function ShimmerBox({
    width = '100%',
    height,
    borderRadius = 6,
    style,
    color = '#E5E7EB',
}: ShimmerBoxProps) {
    const anim = useShimmerAnim();

    const opacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: color,
                    opacity,
                },
                style,
            ]}
        />
    );
}
