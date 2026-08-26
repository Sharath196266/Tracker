import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import CustomChip from '../components/CustomChip';
import { COLORS } from '../constants/theme';

const ACCOUNTS = ['Axis', 'Canara', 'SBI', 'Kotak'];
const PASTEL_BG = [COLORS.mint, COLORS.lavender, COLORS.sand, COLORS.blush];

export default function BalanceScreen({ balances, setBalances }) {
  const [selectedSource, setSelectedSource] = useState(ACCOUNTS[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleAddBalance = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    const added = parseFloat(amount);
    const updated = { ...balances, [selectedSource]: (balances[selectedSource] || 0) + added };

    setBalances(updated);
    await AsyncStorage.setItem('@balances', JSON.stringify(updated));

    setAmount('');
    setDescription('');
    Alert.alert('Success', `Added ₹${added} to ${selectedSource}`);
  };

  const totalFunds = Object.values(balances).reduce((sum, v) => sum + v, 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <Text style={styles.screenTitle}>Wallet & Accounts</Text>

      {/* Grid of 4 Pastel Cards */}
      <View style={styles.cardGrid}>
        {ACCOUNTS.map((acc, idx) => (
          <View key={acc} style={[styles.balanceCard, { backgroundColor: PASTEL_BG[idx] }]}>
            <Text style={styles.accountName}>{acc} Bank</Text>
            <Text style={styles.accountBalance}>₹{(balances[acc] || 0).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Total Liquidity Banner */}
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Total Liquidity</Text>
        <Text style={styles.totalVal}>₹{totalFunds.toFixed(2)}</Text>
      </View>

      {/* Deposit Input Section */}
      <Text style={styles.formTitle}>Add Funds</Text>

      <View style={{ height: 38, marginBottom: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ACCOUNTS.map((acc) => (
            <CustomChip
              key={acc}
              label={acc}
              active={selectedSource === acc}
              onPress={() => setSelectedSource(acc)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="Amount (₹)"
            placeholderTextColor={COLORS.muted}
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={{ flex: 1.5 }}>
          <TextInput
            style={styles.input}
            placeholder="Note / Reference"
            placeholderTextColor={COLORS.muted}
            value={description}
            onChangeText={setDescription}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleAddBalance} activeOpacity={0.8}>
        <Text style={styles.submitBtnText}>Deposit to {selectedSource}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 36 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  balanceCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    height: 75,
    justifyContent: 'center',
  },
  accountName: { color: COLORS.text, fontSize: 12, fontWeight: '600', opacity: 0.7 },
  accountBalance: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  totalBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  totalLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  totalVal: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  formTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.text,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});