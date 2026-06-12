import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { fetchMonthlyBudget, saveMonthlyBudget } from './supabaseSettings';

const FALLBACK_RATES = {
  USD: 1.0,
  TRY: 32.5,
  EUR: 0.92857
};

const isValidCurrency = (value: string | null): value is 'TRY' | 'USD' | 'EUR' => {
  return value === 'TRY' || value === 'USD' || value === 'EUR';
};

const isValidRates = (obj: unknown): obj is Record<string, number> => {
  if (typeof obj !== 'object' || obj === null) return false;
  const entries = Object.entries(obj);
  return entries.length > 0 && entries.every(([_, v]) => typeof v === 'number' && !isNaN(v));
};


let currentBudget: number | null = null;
let currentUserId: string | null = null;
let getTokenCallback: (() => Promise<string | null>) | null = null;
let isCacheLoaded = false;
let isNetworkLoaded = false;
let activeAuthSessionId = 0;

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

  // Save to local cache first (non-blocking)
  if (currentUserId) {
    try {
      if (currentBudget !== null) {
        await SecureStore.setItemAsync(`monthlyBudget_${currentUserId}`, currentBudget.toString());
      } else {
        await SecureStore.deleteItemAsync(`monthlyBudget_${currentUserId}`);
      }
    } catch (error) {
      console.error('[SettingsStore] Failed to cache budget:', error);
    }
  }

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
    if (isValidCurrency(cachedCurrency)) {
      currentPreferredCurrency = cachedCurrency;
    }

    const cachedRatesStr = await SecureStore.getItemAsync('currencyRates');
    if (cachedRatesStr) {
      try {
        const parsed = JSON.parse(cachedRatesStr);
        if (isValidRates(parsed)) {
          cachedRates = parsed;
        }
      } catch {
        // Fallback to existing rates
      }
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
    if (!response.ok) {
      console.error(`[SettingsStore] Failed to fetch latest exchange rates: HTTP status ${response.status}`);
      return;
    }
    const data = await response.json();
    if (data && data.rates && isValidRates(data.rates)) {
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
  // Guard: if userId is null, empty string, or undefined/not a string, treat as logout
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    // Invalidate cache for the logging out user before resetting
    if (currentUserId) {
      try {
        await SecureStore.deleteItemAsync(`monthlyBudget_${currentUserId}`);
      } catch (error) {
        console.error('[SettingsStore] Failed to clear budget cache on logout:', error);
      }
    }
    currentUserId = null;
    getTokenCallback = null;
    currentBudget = null;
    isCacheLoaded = false;
    isNetworkLoaded = false;
    emit();
    return;
  }

  // Guard: if already bound to this user, only update callback and skip reloading
  if (currentUserId === userId) {
    getTokenCallback = getTokenFn;
    return;
  }

  currentUserId = userId;
  getTokenCallback = getTokenFn;

  // Increment session to track active async workflows
  const sessionId = ++activeAuthSessionId;

  // Reset loading states for new session
  isCacheLoaded = false;
  isNetworkLoaded = false;
  emit();

  // 1. Try loading from cache immediately
  try {
    const cachedBudgetStr = await SecureStore.getItemAsync(`monthlyBudget_${userId}`);
    if (sessionId === activeAuthSessionId) {
      if (cachedBudgetStr !== null) {
        currentBudget = parseFloat(cachedBudgetStr);
      } else {
        currentBudget = null;
      }
      isCacheLoaded = true;
      emit();
    }
  } catch (error) {
    console.error('[SettingsStore] Failed to load cached budget:', error);
    if (sessionId === activeAuthSessionId) {
      isCacheLoaded = true;
      emit();
    }
  }

  if (getTokenFn) {
    let timeoutId: any = null;

    // Timeout fallback: if network request doesn't resolve within 5 seconds, fall back
    timeoutId = setTimeout(() => {
      if (sessionId === activeAuthSessionId && !isNetworkLoaded) {
        console.warn('[SettingsStore] Fetching budget timed out, falling back.');
        isNetworkLoaded = true;
        emit();
      }
    }, 5000);

    try {
      const token = await getTokenFn();
      if (sessionId !== activeAuthSessionId) {
        if (timeoutId) clearTimeout(timeoutId);
        return;
      }

      if (token) {
        const budget = await fetchMonthlyBudget(userId, token);
        if (sessionId === activeAuthSessionId) {
          currentBudget = budget;
          isNetworkLoaded = true;
          if (timeoutId) clearTimeout(timeoutId);
          emit();

          // Update cache with the new revalidated value
          try {
            if (budget !== null) {
              await SecureStore.setItemAsync(`monthlyBudget_${userId}`, budget.toString());
            } else {
              await SecureStore.deleteItemAsync(`monthlyBudget_${userId}`);
            }
          } catch (cacheError) {
            console.error('[SettingsStore] Failed to update budget cache:', cacheError);
          }
        }
      } else {
        if (sessionId === activeAuthSessionId) {
          isNetworkLoaded = true;
          if (timeoutId) clearTimeout(timeoutId);
          emit();
        }
      }
    } catch (error) {
      console.error('[SettingsStore] Failed to fetch settings on auth bind:', error);
      if (sessionId === activeAuthSessionId) {
        isNetworkLoaded = true;
        if (timeoutId) clearTimeout(timeoutId);
        emit();
      }
    }
  } else {
    // If no token function provided, mark as network loaded immediately
    isNetworkLoaded = true;
    emit();
  }
};

export const isSettingsLoaded = (): boolean => isNetworkLoaded;

export const useIsCacheLoaded = (): boolean => {
  const [loaded, setLoaded] = useState(isCacheLoaded);

  useEffect(() => {
    const handleUpdate = () => {
      setLoaded(isCacheLoaded);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return loaded;
};

export const useIsNetworkLoaded = (): boolean => {
  const [loaded, setLoaded] = useState(isNetworkLoaded);

  useEffect(() => {
    const handleUpdate = () => {
      setLoaded(isNetworkLoaded);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return loaded;
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

