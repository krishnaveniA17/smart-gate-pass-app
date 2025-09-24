// src/components/ResponsiveContainer.js
import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';

export default function ResponsiveContainer({ children, style }) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FA' },
  inner: { flex: 1, paddingHorizontal: '4%' },
});
