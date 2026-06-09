import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { fetchMonthlyBudget, saveMonthlyBudget } from './supabaseSettings';

const FALLBACK_RATES = {
  USD: 1.0,
  TRY: 32.5,
  EUR: 0.92857
};

let currentBudget: number | null = null;
let currentUserId: string | null = null;
let getTokenCallback: (() => Promise<string | null>) | null = null;
let isLoaded = false;

let currentPreferredCurrency: 'TRY' | 'USD' | 'EUR' = 'USD';
let cachedRates: Record<string, number> = FALLBACK_RATES;

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach(l => l());
};

export const convertCurrency = (amount: number, from: string, to: string): number => {
  if (amount === 0) return 0;
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  const rateFrom = cachedRates[fromUpper] || 1.0;
  const rateTo = cachedRates[toUpper] || 1.0;

  const amountInUSD = amount / rateFrom;
  return amountInUSD * rateTo;
};

export const getMonthlyBudget = (): number | null => {
  if (currentBudget === null) return null;
  return convertCurrency(currentBudget, 'USD', currentPreferredCurrency);
};

export const setMonthlyBudget = async (budget: number | null): Promise<void> => {
  if (budget === null) {
    currentBudget = null;
  } else {
    currentBudget = convertCurrency(budget, currentPreferredCurrency, 'USD');
  }
  emit();

  if (currentUserId && getTokenCallback) {
    try {
      const token = await getTokenCallback();
      if (token) {
        await saveMonthlyBudget(currentUserId, token, currentBudget);
      }
    } catch (error) {
      console.error('[SettingsStore] Failed to persist budget in Supabase:', error);
    }
  }
};

export const getPreferredCurrency = (): 'TRY' | 'USD' | 'EUR' => currentPreferredCurrency;

export const setPreferredCurrency = async (currency: 'TRY' | 'USD' | 'EUR'): Promise<void> => {
  currentPreferredCurrency = currency;
  emit();

  try {
    await SecureStore.setItemAsync('preferredCurrency', currency);
  } catch (error) {
    console.error('[SettingsStore] Failed to persist preferred currency in SecureStore:', error);
  }
};

export const getCachedRates = (): Record<string, number> => cachedRates;

export const initSettingsStore = async (): Promise<void> => {
  try {
    const cachedCurrency = await SecureStore.getItemAsync('preferredCurrency');
    if (cachedCurrency) {
      currentPreferredCurrency = cachedCurrency as 'TRY' | 'USD' | 'EUR';
    }

    const cachedRatesStr = await SecureStore.getItemAsync('currencyRates');
    if (cachedRatesStr) {
      cachedRates = JSON.parse(cachedRatesStr);
    }
  } catch (error) {
    console.error('[SettingsStore] Failed to load settings from SecureStore:', error);
  } finally {
    emit();
  }
};

export const fetchLatestRates = async (): Promise<void> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.rates) {
      cachedRates = data.rates;
      // Filter rates to only persist supported currencies (TRY, USD, EUR)
      // to prevent SecureStore 2048-byte limit warnings.
      const ratesToPersist = {
        USD: data.rates.USD || 1.0,
        TRY: data.rates.TRY || 32.5,
        EUR: data.rates.EUR || 0.92857
      };
      await SecureStore.setItemAsync('currencyRates', JSON.stringify(ratesToPersist));
      emit();
    }
  } catch (error) {
    console.error('[SettingsStore] Failed to fetch latest exchange rates:', error);
    // If cachedRates is still the fallback (no valid loaded cache), keep using fallback
  }
};

export const bindSettingsAuth = async (
  userId: string | null,
  getTokenFn: (() => Promise<string | null>) | null
): Promise<void> => {
  currentUserId = userId;
  getTokenCallback = getTokenFn;

  if (userId && getTokenFn) {
    try {
      const token = await getTokenFn();
      if (token) {
        const budget = await fetchMonthlyBudget(userId, token);
        currentBudget = budget;
      }
    } catch (error) {
      console.error('[SettingsStore] Failed to fetch settings on auth bind:', error);
    } finally {
      isLoaded = true;
      emit();
    }
  } else {
    // Logout or unauthenticated: reset state
    currentBudget = null;
    isLoaded = false;
    emit();
  }
};

export const useMonthlyBudget = (): number | null => {
  const [budget, setBudget] = useState(getMonthlyBudget());

  useEffect(() => {
    const handleUpdate = () => {
      setBudget(getMonthlyBudget());
    };
    
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return budget;
};

export const usePreferredCurrency = (): 'TRY' | 'USD' | 'EUR' => {
  const [preferredCurrency, setPreferredCurrencyState] = useState(currentPreferredCurrency);

  useEffect(() => {
    const handleUpdate = () => {
      setPreferredCurrencyState(currentPreferredCurrency);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return preferredCurrency;
};

