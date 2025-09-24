// src/components/RButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { verticalScale, moderateScale } from '../utils/responsive';

export default function RButton({ title, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]}>
      <Text style={styles.txt}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#0a84ff',
  },
  txt: { textAlign: 'center', fontWeight: '600', color: '#fff', fontSize: moderateScale(15) },
});
