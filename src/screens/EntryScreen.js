import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform as RNPlatform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import Header from '../components/Header';
import CustomChip from '../components/CustomChip';
import { COLORS, DEFAULT_CATEGORIES } from '../constants/theme';
import { saveExpensesToStorage } from '../utils/storage';

const FALLBACK_SOURCES = [
  { name: 'Axis', type: 'savings' },
  { name: 'Canara', type: 'savings' },
  { name: 'SBI', type: 'savings' },
  { name: 'Kotak', type: 'savings' },
];
const TYPE_LABELS = { savings: 'Bank', credit: 'Credit Card', loan: 'Loan', investment: 'Investment' };
const PLATFORM_OPTIONS = {
  savings: [],
  credit: [],
  loan: [],
  investment: [],
};
const SOURCE_CATEGORIES = {
  savings: ['Transfer Out', 'Deposit'],
  credit: ['Card Usage', 'Card Bill', 'Early Card Payment'],
  loan: ['Loan EMI', 'Early Loan Payment', 'Loan Disbursement'],
  investment: ['Investment Add', 'Investment SIP', 'Investment Withdrawal'],
};

export default function EntryScreen({ expenses, setExpenses, balances, setBalances, sources: sharedSources, setSources, userName }) {
  const sources = sharedSources?.length ? sharedSources : FALLBACK_SOURCES;
  const [source, setSource] = useState(FALLBACK_SOURCES[0].name);
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS.savings[0]);
  const [customPlatform, setCustomPlatform] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPayees, setShowPayees] = useState(false);
  const [showPlatformInput, setShowPlatformInput] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [customPlatforms, setCustomPlatforms] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [platformLinks, setPlatformLinks] = useState({});
  const [linkedSources, setLinkedSources] = useState([]);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    const firstSource = sources[0];
    if (firstSource && !sources.some((item) => item.name === source)) {
      setSource(firstSource.name);
      setPlatform(PLATFORM_OPTIONS[firstSource.type]?.[0] || 'Other');
    }
  }, [sharedSources]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@custom_platforms'),
      AsyncStorage.getItem('@custom_categories'),
      AsyncStorage.getItem('@platform_links'),
    ]).then(([platforms, categories, links]) => {
      try { if (platforms) setCustomPlatforms(JSON.parse(platforms)); } catch {}
      try { if (categories) setCustomCategories(JSON.parse(categories)); } catch {}
      try { if (links) setPlatformLinks(JSON.parse(links)); } catch {}
    });
  }, []);

  const selectedSource = sources.find((item) => item.name === source) || FALLBACK_SOURCES[0];
  const sourceOptions = useMemo(() => sources.filter((item) => item.name !== source), [sources, source]);
  const payeeIsSource = sources.some((item) => item.name.toLowerCase() === payee.trim().toLowerCase());
  const payeeSource = sources.find((item) => item.name.toLowerCase() === payee.trim().toLowerCase());
  const categories = payeeIsSource ? (SOURCE_CATEGORIES[payeeSource.type] || SOURCE_CATEGORIES.savings) : DEFAULT_CATEGORIES;

  const showAlert = (title, message, type = 'success') => setAlertConfig({ visible: true, title, message, type });

  const selectSource = (nextSource) => {
    const nextRecord = sources.find((item) => item.name === nextSource);
    setSource(nextSource);
    setShowPlatformInput(false);
    setShowCategoryInput(false);
    setPlatform(PLATFORM_OPTIONS[nextRecord?.type || 'savings']?.[0] || 'Other');
    setCategory(DEFAULT_CATEGORIES[0]);
  };

  const addPlatform = () => {
    const nextPlatform = customPlatform.trim();
    if (!nextPlatform) return;
    setPlatform(nextPlatform);
    const links = linkedSources.length ? linkedSources : [source];
    const updatedLinks = { ...platformLinks, [nextPlatform]: links };
    setPlatformLinks(updatedLinks);
    AsyncStorage.setItem('@platform_links', JSON.stringify(updatedLinks));
    const updatedPlatforms = [...new Set([...customPlatforms, nextPlatform])];
    setCustomPlatforms(updatedPlatforms);
    AsyncStorage.setItem('@custom_platforms', JSON.stringify(updatedPlatforms));
    setCustomPlatform('');
    setShowPlatformInput(false);
  };

  const addCategory = () => {
    const nextCategory = customCategory.trim();
    if (!nextCategory) return;
    setCategory(nextCategory);
    const updatedCategories = [...new Set([...customCategories, nextCategory])];
    setCustomCategories(updatedCategories);
    AsyncStorage.setItem('@custom_categories', JSON.stringify(updatedCategories));
    setCustomCategory('');
    setShowCategoryInput(false);
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      const nextDate = new Date(selectedDate);
      nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(nextDate);
    }
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (time) {
      const nextDate = new Date(selectedDate);
      nextDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(nextDate);
    }
  };

  const handleSave = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return showAlert('Invalid amount', 'Please enter an amount greater than zero.', 'error');
    if (!payee.trim()) return showAlert('Payee required', 'Select a source or enter a custom payee.', 'error');

    const parsedAmount = parseFloat(amount);
    const finalCategory = category === 'Other' ? customCategory.trim() || 'Other' : category;
    const finalPlatform = platform === 'Other' ? customPlatform.trim() || 'Other' : platform;
    const formattedDateTime = selectedDate.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    const newTransaction = {
      id: Date.now().toString(), dateTime: formattedDateTime, rawDate: selectedDate.toISOString(), source,
      sourceType: selectedSource.type, platform: finalPlatform, amount: parsedAmount, payee: payee.trim(),
      payeeSourceType: payeeSource?.type || null, place: place.trim() || 'N/A', category: finalCategory, description: description.trim() || 'N/A',
    };

    const updatedExpenses = [newTransaction, ...expenses];
    let updatedBalances = { ...balances };
    const sourceBalance = updatedBalances[source] || 0;
    const sourceDelta = ['credit', 'loan'].includes(selectedSource.type) ? parsedAmount : -parsedAmount;
    updatedBalances[source] = sourceBalance + sourceDelta;

    if (payeeSource) {
      const isLiabilityPayment = payeeSource.type === 'credit' || payeeSource.type === 'loan';
      const payeeDelta = isLiabilityPayment ? -parsedAmount : parsedAmount;
      updatedBalances[payeeSource.name] = (updatedBalances[payeeSource.name] || 0) + payeeDelta;
      if (payeeSource.type === 'loan' && updatedBalances[payeeSource.name] <= 0 && setSources) {
        const updatedSources = sources.filter((item) => item.name !== payeeSource.name);
        setSources(updatedSources);
        await AsyncStorage.setItem('@balance_sources', JSON.stringify(updatedSources));
      }
    }

    const balanceTransaction = {
      id: `${newTransaction.id}-balance`, source, payee: payee.trim(), type: finalCategory,
      amount: parsedAmount, direction: sourceDelta >= 0 ? 'in' : 'out', date: selectedDate.toISOString(),
    };
    const savedBalanceTransactions = JSON.parse(await AsyncStorage.getItem('@balance_transactions') || '[]');
    await saveExpensesToStorage(updatedExpenses);
    await AsyncStorage.setItem('@balances', JSON.stringify(updatedBalances));
    await AsyncStorage.setItem('@balance_transactions', JSON.stringify([balanceTransaction, ...savedBalanceTransactions]));
    setExpenses(updatedExpenses);
    setBalances(updatedBalances);
    setAmount(''); setPayee(''); setPlace(''); setDescription(''); setCustomPlatform(''); setCustomCategory(''); setSelectedDate(new Date());
    showAlert('Saved', payeeSource ? 'Recorded in Ledger and both balance sources.' : 'Transaction logged successfully.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header userName={userName} />
      <KeyboardAvoidingView style={styles.flex} behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={RNPlatform.OS === 'ios' ? 8 : 0}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.screenTitle}>New Entry</Text>
          <Text style={styles.label}>Date & Time</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.input, styles.dateTimeBox]} onPress={() => setShowDatePicker(true)}><Ionicons name="calendar-outline" size={16} color={COLORS.muted} /><Text style={styles.dateTimeText}>{selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.input, styles.dateTimeBox]} onPress={() => setShowTimePicker(true)}><Ionicons name="time-outline" size={16} color={COLORS.muted} /><Text style={styles.dateTimeText}>{selectedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text></TouchableOpacity>
          </View>
          {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display={RNPlatform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />}
          {showTimePicker && <DateTimePicker value={selectedDate} mode="time" display={RNPlatform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleTimeChange} />}

          <Text style={styles.label}>Payment Source</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionScroll}>{sources.map((item) => <CustomChip key={item.name} label={`${item.name} (${TYPE_LABELS[item.type] || item.type})`} active={source === item.name} onPress={() => selectSource(item.name)} />)}</ScrollView>
          <Text style={styles.label}>Platform</Text>
          <View style={styles.optionLine}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionScroll}>{[...(PLATFORM_OPTIONS[selectedSource.type] || []), ...customPlatforms].filter((item, index, list) => list.indexOf(item) === index).map((item) => <CustomChip key={item} label={item} active={platform === item} onPress={() => { setPlatform(item); setShowPlatformInput(false); }} />)}<CustomChip label="Other" active={platform === 'Other'} onPress={() => { setPlatform('Other'); setShowPlatformInput(false); }} /></ScrollView><TouchableOpacity style={styles.addButton} onPress={() => setShowPlatformInput(!showPlatformInput)}><Ionicons name={showPlatformInput ? 'close' : 'add'} size={18} color={COLORS.text} /></TouchableOpacity></View>
          {platform === 'Other' || showPlatformInput ? <View style={styles.inlineAdd}><TextInput style={[styles.input, styles.flex]} placeholder="New platform" placeholderTextColor={COLORS.muted} value={customPlatform} onChangeText={setCustomPlatform} /><TouchableOpacity style={styles.smallButton} onPress={addPlatform}><Text style={styles.smallButtonText}>Add</Text></TouchableOpacity><TouchableOpacity style={styles.smallButton} onPress={() => setShowPlatformInput(false)}><Text style={styles.smallButtonText}>Back</Text></TouchableOpacity></View> : null}
          {showPlatformInput && <><Text style={styles.label}>Link platform to sources</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionScroll}>{sources.map((item) => <CustomChip key={item.name} label={item.name} active={linkedSources.includes(item.name)} onPress={() => setLinkedSources((previous) => previous.includes(item.name) ? previous.filter((name) => name !== item.name) : [...previous, item.name])} />)}</ScrollView></>}

          <Text style={styles.label}>Payee</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowPayees(!showPayees)}><Text style={payee ? styles.valueText : styles.placeholderText}>{payee || 'Select source or enter custom payee'}</Text><Ionicons name={showPayees ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} /></TouchableOpacity>
          {showPayees && <View style={styles.dropdown}>{sourceOptions.map((item) => <TouchableOpacity key={item.name} style={styles.dropdownItem} onPress={() => { setPayee(item.name); setShowPayees(false); setCategory((SOURCE_CATEGORIES[item.type] || DEFAULT_CATEGORIES)[0]); }}><Text style={styles.valueText}>{item.name}</Text><Text style={styles.dropdownHint}>{TYPE_LABELS[item.type]}</Text></TouchableOpacity>)}<TextInput style={styles.dropdownInput} placeholder="Or type custom payee" placeholderTextColor={COLORS.muted} value={payeeSource ? '' : payee} onChangeText={setPayee} onSubmitEditing={() => setShowPayees(false)} /></View>}

          <View style={styles.row}><View style={styles.flex}><Text style={styles.label}>Amount (₹)</Text><TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={COLORS.muted} value={amount} onChangeText={setAmount} /></View><View style={styles.flex}><Text style={styles.label}>Place</Text><TextInput style={styles.input} placeholder="e.g. Bangalore" placeholderTextColor={COLORS.muted} value={place} onChangeText={setPlace} /></View></View>
          <Text style={styles.label}>Category</Text>
          <View style={styles.optionLine}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionScroll}>{[...categories, ...customCategories].filter((item, index, list) => list.indexOf(item) === index).map((item) => <CustomChip key={item} label={item} active={category === item} onPress={() => { setCategory(item); setShowCategoryInput(false); }} />)}<CustomChip label="Other" active={category === 'Other'} onPress={() => { setCategory('Other'); setShowCategoryInput(false); }} /></ScrollView><TouchableOpacity style={styles.addButton} onPress={() => setShowCategoryInput(!showCategoryInput)}><Ionicons name={showCategoryInput ? 'close' : 'add'} size={18} color={COLORS.text} /></TouchableOpacity></View>
          {category === 'Other' || showCategoryInput ? <View style={styles.inlineAdd}><TextInput style={[styles.input, styles.flex]} placeholder="New category" placeholderTextColor={COLORS.muted} value={customCategory} onChangeText={setCustomCategory} /><TouchableOpacity style={styles.smallButton} onPress={addCategory}><Text style={styles.smallButtonText}>Add</Text></TouchableOpacity></View> : null}
          <Text style={styles.label}>Description</Text><TextInput style={[styles.input, styles.description]} placeholder="Optional note" placeholderTextColor={COLORS.muted} value={description} onChangeText={setDescription} multiline />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSave}><Text style={styles.submitBtnText}>Save Transaction</Text></TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={alertConfig.visible} animationType="fade"><View style={styles.modalOverlay}><View style={styles.alertCard}><Ionicons name={alertConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={38} color={alertConfig.type === 'success' ? COLORS.accentGreen : COLORS.danger} /><Text style={styles.alertTitle}>{alertConfig.title}</Text><Text style={styles.alertMessage}>{alertConfig.message}</Text><TouchableOpacity style={styles.alertBtn} onPress={() => setAlertConfig((previous) => ({ ...previous, visible: false }))}><Text style={styles.alertBtnText}>Continue</Text></TouchableOpacity></View></View></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 36 }, content: { paddingBottom: 34 }, screenTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 }, label: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 10, marginBottom: 6 }, row: { flexDirection: 'row', gap: 10, marginBottom: 2 }, input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: COLORS.text }, dateTimeBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }, dateTimeText: { fontSize: 12, fontWeight: '700', color: COLORS.text }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, optionLine: { flexDirection: 'row', alignItems: 'center', gap: 6 }, optionScroll: { flexGrow: 1, gap: 5, paddingBottom: 3 }, addButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' }, inlineAdd: { flexDirection: 'row', gap: 7, marginTop: 6 }, smallButton: { backgroundColor: COLORS.text, borderRadius: 10, paddingHorizontal: 15, justifyContent: 'center' }, smallButtonText: { color: '#FFF', fontWeight: '700' }, placeholderText: { color: COLORS.muted, flex: 1 }, valueText: { color: COLORS.text, flex: 1 }, dropdown: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 10, marginTop: 4, padding: 5 }, dropdownItem: { padding: 9, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder, flexDirection: 'row', justifyContent: 'space-between' }, dropdownHint: { color: COLORS.muted, fontSize: 11 }, dropdownInput: { padding: 9, color: COLORS.text }, description: { minHeight: 58, textAlignVertical: 'top' }, submitBtn: { backgroundColor: COLORS.text, paddingVertical: 12, borderRadius: 12, marginTop: 18, alignItems: 'center' }, submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }, alertCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, alignItems: 'center' }, alertTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 8 }, alertMessage: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginVertical: 8 }, alertBtn: { backgroundColor: COLORS.text, width: '100%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 6 }, alertBtnText: { color: '#FFF', fontWeight: '700' },
});
