// src/components/RText.js
import React from 'react';
import { Text } from 'react-native';
import { normalizeFont } from '../utils/responsive';

export default function RText({ children, size = 14, style, ...rest }) {
  return (
    <Text style={[{ fontSize: normalizeFont(size) }, style]} {...rest}>
      {children}
    </Text>
  );
}
