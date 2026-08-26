import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import EntryScreen from './src/screens/EntryScreen';
import LedgerScreen from './src/screens/LedgerScreen';
import BalanceScreen from './src/screens/BalanceScreen';
import StatsScreen from './src/screens/StatsScreen';
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();
const INITIAL_BALANCES = { Axis: 0, Canara: 0, SBI: 0, Kotak: 0 };

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(INITIAL_BALANCES);

  useEffect(() => {
    (async () => {
      const savedExp = await AsyncStorage.getItem('@expenses');
      const savedBal = await AsyncStorage.getItem('@balances');
      if (savedExp) setExpenses(JSON.parse(savedExp));
      if (savedBal) setBalances(JSON.parse(savedBal));
    })();
  }, []);

  return (
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
          {() => <BalanceScreen balances={balances} setBalances={setBalances} />}
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
          {() => <StatsScreen expenses={expenses} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}