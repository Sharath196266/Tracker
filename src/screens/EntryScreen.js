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
import { COLORS, DEFAULT_CATEGORIES, SOURCES } from '../constants/theme';
import { saveExpensesToStorage } from '../utils/storage';

export default function EntryScreen({ expenses, setExpenses, balances, setBalances }) {
  const [source, setSource] = useState(SOURCES[0]);
  const [customSource, setCustomSource] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (!payee.trim()) {
      Alert.alert('Validation Error', 'Please enter payee name.');
      return;
    }

    const parsedAmt = parseFloat(amount);
    const finalSource = source === 'Other' ? customSource.trim() || 'Other' : source;
    const finalCategory = category === 'Other' ? customCategory.trim() || 'Other' : category;

    const newTransaction = {
      id: Date.now().toString(),
      dateTime: new Date().toLocaleString(),
      source: finalSource,
      amount: parsedAmt,
      payee: payee.trim(),
      place: place.trim() || 'N/A',
      category: finalCategory,
      description: description.trim() || 'N/A',
    };

    const updatedExp = [newTransaction, ...expenses];
    setExpenses(updatedExp);
    await saveExpensesToStorage(updatedExp);

    let targetBank = null;
    const sLower = finalSource.toLowerCase();
    if (sLower.includes('axis')) targetBank = 'Axis';
    else if (sLower.includes('canara')) targetBank = 'Canara';
    else if (sLower.includes('yono') || sLower.includes('sbi')) targetBank = 'SBI';
    else if (sLower.includes('kotak')) targetBank = 'Kotak';

    if (targetBank && balances) {
      const updatedBal = { ...balances, [targetBank]: (balances[targetBank] || 0) - parsedAmt };
      setBalances(updatedBal);
      await AsyncStorage.setItem('@balances', JSON.stringify(updatedBal));
    }

    setAmount('');
    setPayee('');
    setPlace('');
    setDescription('');
    setCustomSource('');
    setCustomCategory('');
    Alert.alert('Saved', 'Transaction logged!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <Text style={styles.screenTitle}>New Entry</Text>

      {/* Horizontal Scroll Source Selector */}
      <Text style={styles.label}>Payment Source</Text>
      <View style={{ height: 38, marginBottom: 10}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SOURCES.map((s) => (
            <CustomChip key={s} label={s} active={source === s} onPress={() => setSource(s)} />
          ))}
        </ScrollView>
      </View>

      {source === 'Other' && (
        <TextInput
          style={[styles.input, { marginBottom: 6 }]}
          placeholder="Custom Source..."
          placeholderTextColor={COLORS.muted}
          value={customSource}
          onChangeText={setCustomSource}
        />
      )}

      {/* Amount & Payee Row */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={COLORS.muted}
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Payee</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Swiggy"
            placeholderTextColor={COLORS.muted}
            value={payee}
            onChangeText={setPayee}
          />
        </View>
      </View>

      {/* Location */}
      <Text style={styles.label}>Location / Place</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Bangalore"
        placeholderTextColor={COLORS.muted}
        value={place}
        onChangeText={setPlace}
      />

      {/* Horizontal Scroll Category Selector */}
      <Text style={styles.label}>Category</Text>
      <View style={{ height: 38, marginBottom: 10, marginTop:2}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DEFAULT_CATEGORIES.map((c) => (
            <CustomChip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
      </View>

      {category === 'Other' && (
        <TextInput
          style={[styles.input, { marginBottom: 10 }]}
          placeholder="Custom Category..."
          placeholderTextColor={COLORS.muted}
          value={customCategory}
          onChangeText={setCustomCategory}
        />
      )}

      {/* Compact Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 44 }]}
        placeholder="Optional note..."
        placeholderTextColor={COLORS.muted}
        value={description}
        onChangeText={setDescription}
      />

      {/* Save Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.submitBtnText}>Save Transaction</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 36},
  screenTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10, marginBottom:10 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 8, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.text,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});