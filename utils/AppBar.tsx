import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from './colors';

interface AppBarProps {
    title: string;
    onBackPress?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ title, onBackPress }) => {
    return (
        <View style={styles.container}>
            {onBackPress && (
                <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
            )}
            <Text style={styles.title}>{title}</Text>
        </View>
    );
};

export default AppBar;

const styles = StyleSheet.create({
    container: {
        height: Platform.OS === 'ios' ? 70 : 48,
        paddingLeft: 12,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        bottom: 15,
    },
    backText: {
        color: Colors.black,
        fontSize: 16,
    },
    title: {
        color: Colors.black,
        fontSize: 18,
        fontWeight: '600',
    },
});