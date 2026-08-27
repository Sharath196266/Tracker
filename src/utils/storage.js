import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@expenses';
const LEGACY_STORAGE_KEY = '@expenses_data_v1';

export const loadExpensesFromStorage = async () => {
  try {
    let jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (jsonValue == null) {
      jsonValue = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (jsonValue != null) await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    }
    const parsed = jsonValue != null ? JSON.parse(jsonValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load expenses', e);
    return [];
  }
};

export const saveExpensesToStorage = async (expenses) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(expenses) ? expenses : []));
  } catch (e) {
    console.error('Failed to save expenses', e);
  }
};