import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from '../components/Header';
import CustomChip from '../components/CustomChip';
import { COLORS, SOURCE_CATEGORIES } from '../constants/theme';

const DEFAULT_SOURCES = [
  { name: 'Axis', type: 'savings' },
  { name: 'Canara', type: 'savings' },
  { name: 'SBI', type: 'savings' },
  { name: 'Kotak', type: 'savings' },
];
const PASTEL_BG = [COLORS.mint, COLORS.lavender, COLORS.sand, COLORS.blush];
const SOURCE_TYPES = [
  { value: 'savings', label: 'Savings / Bank' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'investment', label: 'Investment' },
];
const TRANSACTION_TYPES = SOURCE_CATEGORIES;

export default function BalanceScreen({ balances, setBalances, sources, setSources, balanceTransactions = [], setBalanceTransactions, userName }) {
  const [view, setView] = useState('main');
  const [selectedSource, setSelectedSource] = useState(DEFAULT_SOURCES[0].name);
  const [sourceType, setSourceType] = useState('savings');
  const [sourceName, setSourceName] = useState('');
  const [sourceAmount, setSourceAmount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState(TRANSACTION_TYPES.savings[0]);
  const [verificationStep, setVerificationStep] = useState(0);
  const [sourceAction, setSourceAction] = useState(null);
  const [sourcePermission, setSourcePermission] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pendingSourceAction, setPendingSourceAction] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    (async () => {
    })();
  }, []);

  const showAlert = (title, message, type = 'success') =>
    setAlertConfig({ visible: true, title, message, type });

  const handleAddSource = async (confirmed = false) => {
    if (!permissionGranted && !confirmed) {
      setPendingSourceAction('add');
      return setSourcePermission(true);
    }
    const name = sourceName.trim();
    if (!name) return showAlert('Source name required', 'Enter a name for the bank, card, loan, or investment.', 'error');
    if (sources.some((source) => source.name.toLowerCase() === name.toLowerCase())) {
      return showAlert('Source already exists', 'Choose a different source name.', 'error');
    }
    if (sourceType === 'loan' && (!sourceAmount || isNaN(sourceAmount) || Number(sourceAmount) <= 0)) {
      return showAlert('Loan amount required', 'A new loan must have an amount greater than zero.', 'error');
    }
    const updatedSources = [...sources, { name, type: sourceType }];
    const initialAmount = sourceType === 'loan' ? parseFloat(sourceAmount) : 0;
    const updatedBalances = { ...balances, [name]: initialAmount };
    const sourceTransaction = { id: `${Date.now()}-source`, source: name, type: 'Source Added', sourceType, amount: 0, direction: 'in', description: 'Source created', date: new Date().toISOString() };
    const updatedTransactions = [sourceTransaction, ...balanceTransactions];
    try {
      await AsyncStorage.multiSet([
        ['@balance_sources', JSON.stringify(updatedSources)],
        ['@balances', JSON.stringify(updatedBalances)],
        ['@balance_transactions', JSON.stringify(updatedTransactions)],
      ]);
    } catch (error) {
      showAlert('Save failed', 'The source was not added. Please try again.', 'error');
      console.error('Failed to add source', error);
      return;
    }
    setSources(updatedSources);
    setBalances(updatedBalances);
    setBalanceTransactions(updatedTransactions);
    setSourceName('');
    setSourceAmount('');
    showAlert('Source added', `${name} is ready to use.`);
  };

  const handleDeleteSource = async (source, confirmed = false) => {
    if (!permissionGranted && !confirmed) {
      setPendingSourceAction(`delete:${source}`);
      return setSourcePermission(true);
    }
    if ((balances[source] || 0) !== 0) {
      return showAlert('Cannot delete source', 'Move or clear its balance before deleting it.', 'error');
    }
    const updatedSources = sources.filter((item) => item.name !== source);
    if (!updatedSources.length) return showAlert('Keep one source', 'Add another source before deleting this one.', 'error');
    const updatedBalances = { ...balances };
    delete updatedBalances[source];
    try {
      await AsyncStorage.multiSet([
        ['@balance_sources', JSON.stringify(updatedSources)],
        ['@balances', JSON.stringify(updatedBalances)],
      ]);
    } catch (error) {
      showAlert('Delete failed', 'The source was not deleted. Please try again.', 'error');
      console.error('Failed to delete source', error);
      return;
    }
    setSources(updatedSources);
    setBalances(updatedBalances);
    if (selectedSource === source) setSelectedSource(updatedSources[0].name);
  };

  const beginDeposit = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return showAlert('Invalid amount', 'Please enter an amount greater than zero.', 'error');
    }
    setVerificationStep(1);
  };

  const confirmDeposit = async () => {
    const added = parseFloat(amount);
    const selectedSourceRecord = sources.find((source) => source.name === selectedSource);
    const balanceDirection = ['Early Payment', 'Bill Payment', 'Withdrawal'].includes(transactionType) ? -1 : 1;
    const updatedBalances = { ...balances, [selectedSource]: (balances[selectedSource] || 0) + (added * balanceDirection) };
    const transaction = {
      id: Date.now().toString(),
      source: selectedSource,
      type: transactionType,
      sourceType: selectedSourceRecord?.type || 'savings',
      amount: added,
      direction: balanceDirection >= 0 ? 'in' : 'out',
      description: description.trim() || 'No note added',
      date: new Date().toISOString(),
    };
    let updatedSources = sources;
    if (selectedSourceRecord?.type === 'loan' && (updatedBalances[selectedSource] || 0) <= 0) {
      updatedSources = sources.filter((source) => source.name !== selectedSource);
    }
    const updatedTransactions = [transaction, ...balanceTransactions];
    try {
      await AsyncStorage.multiSet([
        ['@balances', JSON.stringify(updatedBalances)],
        ['@balance_transactions', JSON.stringify(updatedTransactions)],
        ['@balance_sources', JSON.stringify(updatedSources)],
      ]);
    } catch (error) {
      showAlert('Save failed', 'The balance was not changed. Please try again.', 'error');
      console.error('Failed to save balance transaction', error);
      return;
    }
    setBalances(updatedBalances);
    setBalanceTransactions(updatedTransactions);
    if (updatedSources !== sources) setSources(updatedSources);
    setAmount('');
    setDescription('');
    setVerificationStep(0);
    showAlert('Balance updated', `Added ₹${added.toFixed(2)} to ${selectedSource}.`);
  };

  const totals = sources.reduce((summary, source) => {
    const value = balances[source.name] || 0;
    summary[source.type] += value;
    return summary;
  }, { savings: 0, credit: 0, loan: 0, investment: 0 });
  const netAssets = totals.savings + totals.investment - totals.credit - totals.loan;

  return (
    <SafeAreaView style={styles.container}>
      <Header userName={userName} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Wallet & Accounts</Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.topBackButton} onPress={() => setView('main')} accessibilityLabel="Back to balances">
              <Ionicons name="arrow-back" size={16} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topButton, view === 'edit' && styles.topButtonActive]} onPress={() => setView(view === 'edit' ? 'main' : 'edit')}>
              <Ionicons name="create-outline" size={16} color={COLORS.text} />
              <Text style={styles.topButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topButton, view === 'transactions' && styles.topButtonActive]} onPress={() => setView(view === 'transactions' ? 'main' : 'transactions')}>
              <Ionicons name="list-outline" size={16} color={COLORS.text} />
              <Text style={styles.topButtonText}>Transactions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {view === 'main' && (
          <>
            {SOURCE_TYPES.map((type) => {
              const typedSources = sources.filter((source) => source.type === type.value);
              if (!typedSources.length) return null;
              return (
                <View key={type.value} style={styles.sourceGroup}>
                  <Text style={styles.groupTitle}>{type.label}</Text>
                  <View style={styles.cardGrid}>
                    {typedSources.map((source, index) => (
                      <View key={source.name} style={[styles.balanceCard, { backgroundColor: PASTEL_BG[index % PASTEL_BG.length] }]}>
                        <Text style={styles.accountName}>{source.name}</Text>
                        <Text style={styles.accountBalance}>₹{(balances[source.name] || 0).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            <View style={styles.totalBox}><Text style={styles.totalLabel}>Total Savings</Text><Text style={styles.totalVal}>₹{totals.savings.toFixed(2)}</Text></View>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Card Usage</Text><Text style={styles.summaryValue}>₹{totals.credit.toFixed(2)}</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Total Loans</Text><Text style={styles.summaryValue}>₹{totals.loan.toFixed(2)}</Text></View>
              <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Investments</Text><Text style={styles.summaryValue}>₹{totals.investment.toFixed(2)}</Text></View>
              <View style={[styles.summaryBox, styles.assetsBox]}><Text style={styles.summaryLabel}>Total Assets</Text><Text style={styles.summaryValue}>₹{netAssets.toFixed(2)}</Text></View>
            </View>
            <Text style={styles.helperText}>Use Edit to add money or manage your sources.</Text>
          </>
        )}

        {view === 'edit' && (
          <>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Manage sources</Text><Text style={styles.sectionHint}>Banks, cards, loans, and investments</Text></View>
            <View style={styles.sourceList}>{sources.map((source) => (
              <View key={source.name} style={styles.sourceRow}>
                <View><Text style={styles.sourceTitle}>{source.name}</Text><Text style={styles.sourceAmount}>{source.type} · ₹{(balances[source.name] || 0).toFixed(2)}</Text></View>
                <TouchableOpacity onPress={() => handleDeleteSource(source.name)} style={styles.iconButton} accessibilityLabel={`Delete ${source.name}`}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}</View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setSourceAction(sourceAction === 'source' ? null : 'source')}><Ionicons name="add-circle-outline" size={17} color={COLORS.text} /><Text style={styles.secondaryButtonText}>Add source</Text></TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setSourceAction(sourceAction === 'money' ? null : 'money')}><Ionicons name="cash-outline" size={17} color={COLORS.text} /><Text style={styles.secondaryButtonText}>Add money</Text></TouchableOpacity>
            </View>
            {sourceAction === 'source' && <>
            <View style={styles.chipRow}>{SOURCE_TYPES.map((type) => <CustomChip key={type.value} label={type.label} active={sourceType === type.value} onPress={() => { setSourceType(type.value); setTransactionType(TRANSACTION_TYPES[type.value][0]); }} />)}</View>
            <View style={styles.addSourceRow}>
              <TextInput style={[styles.input, styles.sourceInput]} placeholder="New source name" placeholderTextColor={COLORS.muted} value={sourceName} onChangeText={setSourceName} />
              {sourceType === 'loan' && <TextInput style={[styles.input, styles.loanInput]} placeholder="Loan amount" keyboardType="decimal-pad" placeholderTextColor={COLORS.muted} value={sourceAmount} onChangeText={setSourceAmount} />}
              <TouchableOpacity style={styles.smallButton} onPress={handleAddSource}><Ionicons name="add" size={18} color="#FFF" /><Text style={styles.smallButtonText}>Add</Text></TouchableOpacity>
            </View>
            </>}
            {sourceAction === 'money' && <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Add money</Text>
            <View style={styles.chipRow}>{sources.map((source) => <CustomChip key={source.name} label={source.name} active={selectedSource === source.name} onPress={() => { setSelectedSource(source.name); setSourceType(source.type); setTransactionType(TRANSACTION_TYPES[source.type][0]); }} />)}</View>
            <Text style={styles.label}>Transaction type</Text>
            <View style={styles.chipRow}>{TRANSACTION_TYPES[sourceType].map((type) => <CustomChip key={type} label={type} active={transactionType === type} onPress={() => setTransactionType(type)} />)}</View>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.amountInput]} keyboardType="decimal-pad" placeholder="Amount (₹)" placeholderTextColor={COLORS.muted} value={amount} onChangeText={setAmount} />
              <TextInput style={[styles.input, styles.noteInput]} placeholder="Note / reference" placeholderTextColor={COLORS.muted} value={description} onChangeText={setDescription} />
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={beginDeposit}><Text style={styles.submitBtnText}>Review deposit</Text><Ionicons name="arrow-forward" size={17} color="#FFF" /></TouchableOpacity>
            </>}
            <TouchableOpacity style={styles.backButton} onPress={() => setView('main')}><Ionicons name="arrow-back" size={16} color={COLORS.text} /><Text style={styles.backButtonText}>Back to balances</Text></TouchableOpacity>
          </>
        )}

        {view === 'transactions' && (
          <>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Source transactions</Text><Text style={styles.sectionHint}>Deposits and movements recorded from Wallet</Text></View>
            {balanceTransactions.length === 0 ? <Text style={styles.emptyText}>No source transactions yet.</Text> : balanceTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionIcon}><Ionicons name="arrow-down" size={18} color={COLORS.accentGreen} /></View>
                <View style={styles.transactionDetails}><Text style={styles.sourceTitle}>{transaction.type}</Text><Text style={styles.sourceAmount}>{transaction.source} · {transaction.description}</Text><Text style={styles.transactionDate}>{new Date(transaction.date).toLocaleString('en-IN')}</Text></View>
                <Text style={[styles.transactionAmount, transaction.direction === 'out' && styles.outgoingAmount]}>{transaction.direction === 'out' ? '-' : '+'}₹{transaction.amount.toFixed(2)}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.backButton} onPress={() => setView('main')}><Ionicons name="arrow-back" size={16} color={COLORS.text} /><Text style={styles.backButtonText}>Back to balances</Text></TouchableOpacity>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={verificationStep > 0} animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.alertCard}>
          {verificationStep === 1 ? <>
            <Text style={styles.alertTitle}>Step 1 of 2: Review</Text>
            <Text style={styles.alertMessage}>Add ₹{Number(amount || 0).toFixed(2)} to {selectedSource} as {transactionType}?</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setVerificationStep(2)}><Text style={styles.alertBtnText}>Continue verification</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setVerificationStep(0)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </> : <>
            <Text style={styles.alertTitle}>Step 2 of 2: Confirm</Text>
            <Text style={styles.alertMessage}>This will update your {selectedSource} balance and create a source transaction.</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={confirmDeposit}><Text style={styles.alertBtnText}>Confirm and add money</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setVerificationStep(1)}><Text style={styles.cancelText}>Back</Text></TouchableOpacity>
          </>}
        </View></View>
      </Modal>

      <Modal transparent visible={sourcePermission} animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.alertCard}>
          <Ionicons name="shield-checkmark-outline" size={38} color={COLORS.text} />
          <Text style={styles.alertTitle}>Allow source changes?</Text>
          <Text style={styles.alertMessage}>This permission lets you add or delete banks, cards, loans, and investments.</Text>
          <TouchableOpacity style={styles.alertBtn} onPress={() => {
            const action = pendingSourceAction;
            setPermissionGranted(true);
            setSourcePermission(false);
            setPendingSourceAction(null);
            if (action === 'add') handleAddSource(true);
            if (action?.startsWith('delete:')) handleDeleteSource(action.slice(7), true);
          }}><Text style={styles.alertBtnText}>Allow and continue</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setSourcePermission(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal transparent visible={alertConfig.visible} animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.alertCard}>
          <View style={[styles.iconContainer, { backgroundColor: alertConfig.type === 'success' ? COLORS.mint : COLORS.blush }]}><Ionicons name={alertConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={26} color={COLORS.text} /></View>
          <Text style={styles.alertTitle}>{alertConfig.title}</Text><Text style={styles.alertMessage}>{alertConfig.message}</Text>
          <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertConfig((previous) => ({ ...previous, visible: false }))}><Text style={styles.alertBtnText}>Continue</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 36 },
  content: { paddingBottom: 28 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, flex: 1 },
  topActions: { flexDirection: 'row', gap: 6 },
  topBackButton: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  topButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9 },
  topButtonActive: { backgroundColor: COLORS.mint, borderColor: COLORS.mint },
  topButtonText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  sourceGroup: { marginBottom: 8 },
  groupTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  balanceCard: { width: '48%', borderRadius: 16, padding: 14, height: 75, justifyContent: 'center' },
  accountName: { color: COLORS.text, fontSize: 12, fontWeight: '600', opacity: 0.7 },
  accountBalance: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  totalBox: { backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.cardBorder, flexDirection: 'row', justifyContent: 'space-between' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  summaryBox: { width: '48%', backgroundColor: COLORS.card, borderRadius: 12, padding: 11, borderWidth: 1, borderColor: COLORS.cardBorder },
  assetsBox: { backgroundColor: COLORS.mint },
  summaryLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 5 },
  totalLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700' }, totalVal: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  helperText: { color: COLORS.muted, fontSize: 12, marginTop: 14 },
  sectionHeading: { marginBottom: 10 }, sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text }, sectionHint: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  sourceList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, sourceRow: { width: '48%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 11, padding: 11, marginBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700' }, sourceAmount: { color: COLORS.muted, fontSize: 11, marginTop: 3 }, iconButton: { padding: 8 },
  addSourceRow: { flexDirection: 'row', gap: 8, marginTop: 3 }, sourceInput: { flex: 1 }, loanInput: { flex: 0.8 }, smallButton: { backgroundColor: COLORS.text, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 3 }, smallButtonText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 18 }, label: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 5 }, chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, secondaryButton: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, secondaryButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, marginTop: 13 }, input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: COLORS.text }, amountInput: { flex: 1 }, noteInput: { flex: 1.5 },
  submitBtn: { backgroundColor: COLORS.text, paddingVertical: 12, borderRadius: 12, marginTop: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  backButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, padding: 12, marginTop: 8 }, backButtonText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: 30 },
  transactionRow: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 11, padding: 11, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }, transactionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginRight: 9 }, transactionDetails: { flex: 1 }, transactionDate: { color: COLORS.muted, fontSize: 10, marginTop: 3 }, transactionAmount: { color: COLORS.accentGreen, fontWeight: '800', fontSize: 12 }, outgoingAmount: { color: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }, alertCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 }, iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }, alertTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 5, textAlign: 'center' }, alertMessage: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 16 }, alertBtn: { backgroundColor: COLORS.text, width: '100%', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }, alertBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' }, cancelBtn: { padding: 10 }, cancelText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
});
