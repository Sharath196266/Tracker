import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import { COLORS, DEFAULT_CATEGORIES } from '../constants/theme';
import { saveExpensesToStorage } from '../utils/storage';

const STANDARD_PERIODS = ['All', 'This Week', 'This Month', 'Last 6 Months'];

export default function LedgerScreen({ expenses, setExpenses, balances, setBalances, sources, userName }) {
  const [sourceFilter, setSourceFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [filterDraft, setFilterDraft] = useState({ source: 'All', category: 'All', platform: 'All', period: 'All' });
  const [filterVisible, setFilterVisible] = useState(false);
  const [savedPlatforms, setSavedPlatforms] = useState([]);
  const [savedCategories, setSavedCategories] = useState([]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem('@custom_platforms'), AsyncStorage.getItem('@custom_categories')]).then(([platforms, categories]) => {
      try { if (platforms) setSavedPlatforms(JSON.parse(platforms)); } catch {}
      try { if (categories) setSavedCategories(JSON.parse(categories)); } catch {}
    });
  }, []);

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'error' | 'confirm'
    onConfirm: null,
  });

  const showAlert = (title, message, type = 'success', onConfirm = null) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const sourcesList = useMemo(() => ['All', ...new Set([...(sources || []).map((item) => item.name || item), ...expenses.map((item) => item.source)])], [sources, expenses]);
  const categoriesList = useMemo(() => ['All', ...new Set([...DEFAULT_CATEGORIES, ...savedCategories, ...expenses.map((item) => item.category)])], [expenses, savedCategories]);
  const platformsList = useMemo(() => ['All', ...new Set([...savedPlatforms, ...expenses.map((item) => item.platform).filter(Boolean)])], [expenses, savedPlatforms]);

  // Dynamically extract distinct "MMM YYYY" months present in expense data
  const dynamicMonths = useMemo(() => {
    const monthSet = new Set();
    expenses.forEach((item) => {
      const d = new Date(item.rawDate || item.dateTime);
      if (!isNaN(d.getTime())) {
        const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        monthSet.add(monthLabel);
      }
    });

    // Sort chronologically (newest month first)
    return Array.from(monthSet).sort((a, b) => new Date(b) - new Date(a));
  }, [expenses]);

  // Combined filter list for Period / Month selection
  const allPeriodOptions = useMemo(
    () => [...STANDARD_PERIODS, ...dynamicMonths],
    [dynamicMonths]
  );

  // Amazon-Style Filter Pill Component
  const FilterPill = ({ label, isSelected, onPress }) => (
    <TouchableOpacity
      style={[styles.pill, isSelected && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{label}</Text>
      {isSelected && label !== 'All' && (
        <Ionicons name="checkmark-sharp" size={14} color="#000" style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );

  // Filter and Sort (Newest on Top)
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((item) => {
        if (
          sourceFilter !== 'All' &&
          !item.source.toLowerCase().includes(sourceFilter.toLowerCase())
        )
          return false;
        if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
        if (platformFilter !== 'All' && item.platform !== platformFilter) return false;

        const d = new Date(item.rawDate || item.dateTime);
        if (isNaN(d.getTime())) return periodFilter === 'All';

        if (periodFilter === 'This Week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return d >= startOfWeek;
        }
        if (periodFilter === 'This Month') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (periodFilter === 'Last 6 Months') {
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return d >= sixMonthsAgo;
        }
        if (periodFilter !== 'All') {
          // Custom month filter matching (e.g., "Aug 2026")
          const itemMonthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          return itemMonthLabel === periodFilter;
        }
        return true;
      })
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [expenses, sourceFilter, categoryFilter, platformFilter, periodFilter]);

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [filteredExpenses]
  );

  const activeFilterCount =
    (sourceFilter !== 'All' ? 1 : 0) +
    (categoryFilter !== 'All' ? 1 : 0) +
    (platformFilter !== 'All' ? 1 : 0) +
    (periodFilter !== 'All' ? 1 : 0);

  const resetFilters = () => {
    setSourceFilter('All');
    setCategoryFilter('All');
    setPlatformFilter('All');
    setPeriodFilter('All');
  };

  const openFilters = () => {
    setFilterDraft({ source: sourceFilter, category: categoryFilter, platform: platformFilter, period: periodFilter });
    setFilterVisible(true);
  };

  const applyFilters = () => {
    setSourceFilter(filterDraft.source);
    setCategoryFilter(filterDraft.category);
    setPlatformFilter(filterDraft.platform);
    setPeriodFilter(filterDraft.period);
    setFilterVisible(false);
  };

  const handleExportCSV = async () => {
    if (filteredExpenses.length === 0) {
      showAlert('No Data', 'There are no transactions available to export.', 'error');
      return;
    }

    try {
      const headers = 'ID,Date & Time,Source,Category,Payee,Place,Amount (INR),Description\n';
      const rows = filteredExpenses
        .map((item) =>
          [
            `"${item.id}"`,
            `"${item.dateTime}"`,
            `"${item.source}"`,
            `"${item.category}"`,
            `"${item.payee.replace(/"/g, '""')}"`,
            `"${item.place.replace(/"/g, '""')}"`,
            item.amount,
            `"${(item.description || 'N/A').replace(/"/g, '""')}"`,
          ].join(',')
        )
        .join('\n');

      const csvData = headers + rows;
      const fileName = `Ledger_Export_${Date.now()}.csv`;
      const file = new File(Paths.cache, fileName);
      file.write(csvData);
      const fileUri = file.uri;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Ledger CSV',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        showAlert('Export Saved', `File saved to device cache at: ${fileUri}`, 'success');
      }
    } catch (err) {
      showAlert('Export Failed', err.message || 'Unable to generate CSV file.', 'error');
    }
  };

  const confirmDeleteAction = async (item) => {
    hideAlert();
    const updatedExp = expenses.filter((e) => e.id !== item.id);
    setExpenses(updatedExp);
    await saveExpensesToStorage(updatedExp);

    let targetBank = null;
    const sLower = item.source.toLowerCase();
    if (sLower.includes('axis')) targetBank = 'Axis';
    else if (sLower.includes('canara')) targetBank = 'Canara';
    else if (sLower.includes('yono') || sLower.includes('sbi')) targetBank = 'SBI';
    else if (sLower.includes('kotak')) targetBank = 'Kotak';

    if (targetBank && balances) {
      const updatedBal = { ...balances, [targetBank]: balances[targetBank] + item.amount };
      setBalances(updatedBal);
      await AsyncStorage.setItem('@balances', JSON.stringify(updatedBal));
    }
  };

  const handleDelete = (item) => {
    showAlert(
      'Delete Entry',
      `Are you sure you want to delete this ₹${item.amount.toFixed(2)} entry and restore funds to ${item.source}?`,
      'confirm',
      () => confirmDeleteAction(item)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header userName={userName} />

      {/* Title Bar with Export & Reset Actions */}
      <View style={styles.titleRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.screenSubTitle}>Ledger</Text>
          {activeFilterCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={resetFilters}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
            <MaterialIcons name="file-download" size={16} color="#000" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
        <Ionicons name="funnel-outline" size={16} color={COLORS.text} />
        <Text style={styles.filterButtonText}>Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}</Text>
      </TouchableOpacity>

      {/* Applied filter summary */}
      <View style={styles.appliedSummary}><Text style={styles.summaryText}>{activeFilterCount ? 'Filters applied' : 'Showing all transactions'}</Text><Text style={styles.summaryTotal}>{filteredExpenses.length} result(s)</Text></View>

      {/* Transactions Feed (Newest on Top) */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}><Text style={styles.cardTitle}>{item.payee}</Text><Text style={styles.cardAmount}>-₹{item.amount.toFixed(2)}</Text></View>
            <View style={styles.tagRow}><View style={styles.tag}><Text style={styles.tagText}>{item.source}</Text></View><View style={[styles.tag, styles.categoryTag]}><Text style={styles.tagText}>{item.category}</Text></View></View>
            <Text style={styles.cardMeta}>{item.dateTime} • {item.place}</Text>
            {item.description !== 'N/A' && <Text style={styles.cardDesc}>Note: {item.description}</Text>}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteBtnText}>Delete</Text></TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions match the selected filters.</Text>}
      />

      <Modal transparent visible={filterVisible} animationType="slide">
        <View style={styles.filterModalOverlay}><View style={styles.filterModal}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Filter Ledger</Text><TouchableOpacity onPress={() => setFilterVisible(false)}><Ionicons name="close" size={22} color={COLORS.text} /></TouchableOpacity></View>
          <Text style={styles.filterLabel}>Source</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{sourcesList.map((item) => <FilterPill key={item} label={item} isSelected={filterDraft.source === item} onPress={() => setFilterDraft({ ...filterDraft, source: item })} />)}</ScrollView>
          <Text style={styles.filterLabel}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{categoriesList.map((item) => <FilterPill key={item} label={item} isSelected={filterDraft.category === item} onPress={() => setFilterDraft({ ...filterDraft, category: item })} />)}</ScrollView>
          <Text style={styles.filterLabel}>Platform</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{platformsList.map((item) => <FilterPill key={item} label={item} isSelected={filterDraft.platform === item} onPress={() => setFilterDraft({ ...filterDraft, platform: item })} />)}</ScrollView>
          <Text style={styles.filterLabel}>Period</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{allPeriodOptions.map((item) => <FilterPill key={item} label={item} isSelected={filterDraft.period === item} onPress={() => setFilterDraft({ ...filterDraft, period: item })} />)}</ScrollView>
          <View style={styles.modalActionRow}><TouchableOpacity style={styles.cancelFilterButton} onPress={() => setFilterVisible(false)}><Text>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.applyFilterButton} onPress={applyFilters}><Text style={styles.applyFilterText}>Apply filters</Text></TouchableOpacity></View>
        </View></View>
      </Modal>

      {/* Custom Modal Alert */}
      <Modal transparent visible={alertConfig.visible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    alertConfig.type === 'success'
                      ? COLORS.mint || COLORS.primary
                      : alertConfig.type === 'confirm'
                      ? COLORS.sand || COLORS.cardBorder
                      : COLORS.blush || COLORS.danger,
                },
              ]}
            >
              <Ionicons
                name={
                  alertConfig.type === 'success'
                    ? 'checkmark-circle'
                    : alertConfig.type === 'confirm'
                    ? 'help-circle'
                    : 'alert-circle'
                }
                size={26}
                color={COLORS.text}
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            {alertConfig.type === 'confirm' ? (
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.alertBtn, styles.cancelBtn]}
                  onPress={hideAlert}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertBtn, styles.dangerBtn]}
                  onPress={alertConfig.onConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.alertBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.alertBtn} onPress={hideAlert} activeOpacity={0.8}>
                <Text style={styles.alertBtnText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  screenSubTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  badgeCount: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeCountText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  clearBtnText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  exportBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  filterButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 10, paddingVertical: 10, marginBottom: 8 },
  filterButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  appliedSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.chipBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  filterModal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  cancelFilterButton: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  applyFilterButton: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.text },
  applyFilterText: { color: '#FFF', fontWeight: '700' },
  amazonFilterContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  filterGroup: {
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pill: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  summaryTotal: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  tag: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryTag: {
    borderColor: COLORS.cardBorder,
  },
  tagText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 11,
    color: COLORS.muted,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 30,
    fontSize: 13,
  },

  // Modal Alert Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  alertCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  alertMessage: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  modalActionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  alertBtn: {
    backgroundColor: COLORS.text,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: { flex: 1, backgroundColor: COLORS.chipBg, borderWidth: 1, borderColor: COLORS.border },
  dangerBtn: { flex: 1, backgroundColor: COLORS.danger },
  cancelBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  alertBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});