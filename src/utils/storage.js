import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@expenses_data_v1';

export const loadExpensesFromStorage = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to load expenses', e);
    return [];
  }
};

export const saveExpensesToStorage = async (expenses) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save expenses', e);
  }
};