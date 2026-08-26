import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import Header from '../components/Header';
import { COLORS, SOURCES, DEFAULT_CATEGORIES } from '../constants/theme';

const PERIODS = ['All', 'This Week', 'This Month', 'Last 6 Months'];

export default function LedgerScreen({ expenses, setExpenses, balances, setBalances }) {
  const [sourceFilter, setSourceFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');

  const sourcesList = useMemo(() => ['All', ...SOURCES], []);
  const categoriesList = useMemo(() => ['All', ...DEFAULT_CATEGORIES], []);

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

        const d = new Date(item.dateTime);
        if (isNaN(d.getTime())) return true;

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
        return true;
      })
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [expenses, sourceFilter, categoryFilter, periodFilter]);

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [filteredExpenses]
  );

  const activeFilterCount =
    (sourceFilter !== 'All' ? 1 : 0) +
    (categoryFilter !== 'All' ? 1 : 0) +
    (periodFilter !== 'All' ? 1 : 0);

  const resetFilters = () => {
    setSourceFilter('All');
    setCategoryFilter('All');
    setPeriodFilter('All');
  };

  // CSV Export Utility
  const handleExportCSV = async () => {
    if (filteredExpenses.length === 0) {
      Alert.alert('No Data', 'There are no transactions to export.');
      return;
    }

    try {
      let csvContent = 'ID,Date & Time,Source,Category,Payee,Place,Amount (INR),Description\n';

      filteredExpenses.forEach((item) => {
        const row = [
          `"${item.id}"`,
          `"${item.dateTime}"`,
          `"${item.source}"`,
          `"${item.category}"`,
          `"${item.payee.replace(/"/g, '""')}"`,
          `"${item.place.replace(/"/g, '""')}"`,
          item.amount,
          `"${(item.description || 'N/A').replace(/"/g, '""')}"`,
        ].join(',');
        csvContent += row + '\n';
      });

      const fileUri = `${FileSystem.documentDirectory}Sharath_Ledger_Export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Ledger CSV',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Exported', `File saved to: ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Export Error', 'Could not generate CSV file: ' + err.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Entry', 'Remove transaction and restore funds to balance?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedExp = expenses.filter((e) => e.id !== item.id);
          setExpenses(updatedExp);
          await AsyncStorage.setItem('@expenses', JSON.stringify(updatedExp));

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
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />

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

      {/* Amazon-Style Horizontal Filter Drawer */}
      <View style={styles.amazonFilterContainer}>
        {/* Source Strip */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Source</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sourcesList.map((s) => (
              <FilterPill
                key={s}
                label={s}
                isSelected={sourceFilter === s}
                onPress={() => setSourceFilter(s)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Category Strip */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categoriesList.map((c) => (
              <FilterPill
                key={c}
                label={c}
                isSelected={categoryFilter === c}
                onPress={() => setCategoryFilter(c)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Period Strip */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PERIODS.map((p) => (
              <FilterPill
                key={p}
                label={p}
                isSelected={periodFilter === p}
                onPress={() => setPeriodFilter(p)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Filter Summary Banner */}
      <View style={styles.summaryBanner}>
        <Text style={styles.summaryText}>
          Showing <Text style={{ color: COLORS.text, fontWeight: '700' }}>{filteredExpenses.length}</Text> result(s)
        </Text>
        <Text style={styles.summaryTotal}>Total: ₹{totalFiltered.toFixed(2)}</Text>
      </View>

      {/* Transactions Feed (Newest on Top) */}
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.payee}</Text>
              <Text style={styles.cardAmount}>-₹{item.amount.toFixed(2)}</Text>
            </View>

            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.source}</Text>
              </View>
              <View style={[styles.tag, styles.categoryTag]}>
                <Text style={styles.tagText}>{item.category}</Text>
              </View>
            </View>

            <Text style={styles.cardMeta}>{item.dateTime} • {item.place}</Text>
            {item.description !== 'N/A' && (
              <Text style={styles.cardDesc}>Note: {item.description}</Text>
            )}

            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions match the selected filters.</Text>
        }
      />
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
});