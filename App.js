import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Text, TextInput, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import EntryScreen from './src/screens/EntryScreen';
import LedgerScreen from './src/screens/LedgerScreen';
import BalanceScreen from './src/screens/BalanceScreen';
import StatsScreen from './src/screens/StatsScreen';
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();
const INITIAL_BALANCES = { Axis: 0, Canara: 0, SBI: 0, Kotak: 0, KreditPe: 0, 'Edu Loan': 0, 'Cred Loan': 0 };
const INITIAL_SOURCES = Object.keys(INITIAL_BALANCES).map((name) => ({ name, type: 'savings' }));
const OPTION_CATALOG_VERSION = '3';
INITIAL_SOURCES[4].type = 'credit';
INITIAL_SOURCES[5].type = 'loan';
INITIAL_SOURCES[6].type = 'loan';

const parseStoredValue = (value, fallback) => {
  try {
    const parsed = value ? JSON.parse(value) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(INITIAL_BALANCES);
  const [balanceTransactions, setBalanceTransactions] = useState([]);
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [customPlatforms, setCustomPlatforms] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  useEffect(() => {
    (async () => {
      const currentExpenses = await AsyncStorage.getItem('@expenses');
      const savedExp = currentExpenses || await AsyncStorage.getItem('@expenses_data_v1');
      const savedBal = await AsyncStorage.getItem('@balances');
      const savedBalanceTransactions = await AsyncStorage.getItem('@balance_transactions');
      const savedSources = await AsyncStorage.getItem('@balance_sources');
      const savedName = await AsyncStorage.getItem('@user_name');
      const optionCatalogVersion = await AsyncStorage.getItem('@option_catalog_version');
      if (optionCatalogVersion !== OPTION_CATALOG_VERSION) {
        await AsyncStorage.multiRemove(['@custom_platforms', '@custom_categories', '@platform_links']);
        await AsyncStorage.setItem('@option_catalog_version', OPTION_CATALOG_VERSION);
      }
      const savedPlatforms = parseStoredValue(await AsyncStorage.getItem('@custom_platforms'), []);
      const savedCategories = parseStoredValue(await AsyncStorage.getItem('@custom_categories'), []);
      if (Array.isArray(savedPlatforms)) setCustomPlatforms(savedPlatforms);
      if (Array.isArray(savedCategories)) setCustomCategories(savedCategories);
      if (savedName) setUserName(savedName);
      const parsedExpenses = parseStoredValue(savedExp, []);
      const parsedBalances = parseStoredValue(savedBal, INITIAL_BALANCES);
      const parsedBalanceTransactions = parseStoredValue(savedBalanceTransactions, []);
      if (Array.isArray(parsedExpenses)) setExpenses(parsedExpenses);
      if (!currentExpenses && Array.isArray(parsedExpenses)) {
        await AsyncStorage.setItem('@expenses', JSON.stringify(parsedExpenses));
      }
      if (parsedBalances && typeof parsedBalances === 'object' && !Array.isArray(parsedBalances)) setBalances(parsedBalances);
      if (Array.isArray(parsedBalanceTransactions)) setBalanceTransactions(parsedBalanceTransactions);
      if (savedSources) {
        const savedSourceList = parseStoredValue(savedSources, INITIAL_SOURCES);
        const saved = (Array.isArray(savedSourceList) ? savedSourceList : INITIAL_SOURCES).map((item) => typeof item === 'string' ? { name: item, type: 'savings' } : item);
        const merged = [...saved];
        INITIAL_SOURCES.forEach((defaultSource) => {
          if (!merged.some((source) => source.name === defaultSource.name)) merged.push(defaultSource);
        });
        setSources(merged);
        await AsyncStorage.setItem('@balance_sources', JSON.stringify(merged));
      }
      else await AsyncStorage.setItem('@balance_sources', JSON.stringify(INITIAL_SOURCES));
    })().catch((error) => {
      console.error('Failed to restore Tracker data', error);
    });
  }, []);

  const saveUserName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    await AsyncStorage.setItem('@user_name', name);
    setUserName(name);
  };

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.navBackground,
            borderTopColor: COLORS.cardBorder,
            height: 60,
            paddingBottom: 16,
           // marginBottom: 16,
            paddingTop: 6,
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Entry"
          options={{
            tabBarLabel: 'Entry',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle-outline" size={size} color={color} />
            ),
          }}
        >
          {() => (
            <EntryScreen
              expenses={expenses}
              setExpenses={setExpenses}
              balances={balances}
              setBalances={setBalances}
              sources={sources}
              setSources={setSources}
              userName={userName}
              customPlatforms={customPlatforms}
              setCustomPlatforms={setCustomPlatforms}
              customCategories={customCategories}
              setCustomCategories={setCustomCategories}
              balanceTransactions={balanceTransactions}
              setBalanceTransactions={setBalanceTransactions}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Ledger"
          options={{
            tabBarLabel: 'Ledger',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="notebook-outline" size={size} color={color} />
            ),
          }}
        >
          {() => (
            <LedgerScreen
              expenses={expenses}
              setExpenses={setExpenses}
              balances={balances}
              setBalances={setBalances}
              sources={sources}
              userName={userName}
              customPlatforms={customPlatforms}
              customCategories={customCategories}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Balances"
          options={{
            tabBarLabel: 'Wallet',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="account-balance-wallet" size={size} color={color} />
            ),
          }}
        >
          {() => <BalanceScreen balances={balances} setBalances={setBalances} sources={sources} setSources={setSources} balanceTransactions={balanceTransactions} setBalanceTransactions={setBalanceTransactions} userName={userName} />}
        </Tab.Screen>

        <Tab.Screen
          name="Stats"
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" size={size} color={color} />
            ),
          }}
        >
          {() => <StatsScreen expenses={expenses} sources={sources} userName={userName} />}
        </Tab.Screen>
      </Tab.Navigator>
      <Modal transparent visible={!userName} animationType="fade">
        <View style={styles.setupOverlay}><View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Welcome to Tracker</Text>
          <Text style={styles.setupMessage}>What should we call you?</Text>
          <TextInput autoFocus style={styles.setupInput} placeholder="Your name" placeholderTextColor="#6B7280" value={nameInput} onChangeText={setNameInput} onSubmitEditing={saveUserName} returnKeyType="done" />
          <TouchableOpacity style={styles.setupButton} onPress={saveUserName}><Text style={styles.setupButtonText}>Continue</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  setupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 24 },
  setupCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 22 },
  setupTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 5 },
  setupMessage: { color: COLORS.muted, fontSize: 13, marginBottom: 16 },
  setupInput: { borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: 10, padding: 12, color: COLORS.text, marginBottom: 12 },
  setupButton: { backgroundColor: COLORS.text, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  setupButtonText: { color: '#FFFFFF', fontWeight: '700' },
});