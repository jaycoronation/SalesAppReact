import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface RowProps {
  label: string
  value: string
  accent?: 'default' | 'profit' | 'loss'
  last?: boolean
}

export const Row: React.FC<RowProps> = ({
  label,
  value,
  accent = 'default',
  last = false,
}) => (
  <View style={[styles.row, !last && styles.border]}>
    <Text style={styles.label}>{label}</Text>
    <Text
      style={[
        styles.value,
        accent === 'profit' && styles.profit,
        accent === 'loss' && styles.loss,
      ]}
    >
      {value}
    </Text>
  </View>
)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 2,
  },
  border: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  profit: {
    color: '#059669',
  },
  loss: {
    color: '#DC2626',
  },
})
