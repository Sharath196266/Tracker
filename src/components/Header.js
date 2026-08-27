import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function Header({ onBack, userName }) {
  return (
    <View style={styles.headerContainer}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{userName || 'Tracker'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  backButton: { marginRight: 10, padding: 3 },
});