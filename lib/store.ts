import { useState, useEffect } from 'react';
import { HOME_SUBSCRIPTIONS } from '@/constants/data';
import { icons, IconKey } from '@/constants/icons';
import * as SQLite from 'expo-sqlite';

// Open the database synchronously
const db = SQLite.openDatabaseSync('faturabill.db');

let subscriptions: Subscription[] = [];
let isLoaded = false;
let isLoading = true;

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach(l => l());
};

export interface DBSubscriptionRow {
  id: string;
  name: string;
  price: number;
  billing: string;
  category: string | null;
  plan: string | null;
  paymentMethod: string | null;
  status: string | null;
  startDate: string | null;
  renewalDate: string | null;
  color: string | null;
  currency: string | null;
  isTrial: number | null;
  icon: any;
}

// Helper: Map React Native asset to a string key
const getIconKey = (icon: DBSubscriptionRow['icon'] | string): string => {
  if (typeof icon === 'string') return icon;
  const found = Object.entries(icons).find(([_, value]) => value === icon);
  return found ? found[0] : 'plus';
};

// Helper: Map DB row to Subscription object
const mapRowToSubscription = (row: DBSubscriptionRow): Subscription => {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    billing: row.billing,
    category: row.category || undefined,
    plan: row.plan || undefined,
    paymentMethod: row.paymentMethod || undefined,
    status: row.status || undefined,
    startDate: row.startDate || undefined,
    renewalDate: row.renewalDate || undefined,
    color: row.color || undefined,
    currency: row.currency || undefined,
    isTrial: row.isTrial === 1,
    icon: icons[row.icon as IconKey] || icons.plus
  };
};

// Database Initialization & Seeding
export const initDatabase = async () => {
  try {
    // Create tables if they do not exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        billing TEXT NOT NULL,
        category TEXT,
        plan TEXT,
        paymentMethod TEXT,
        status TEXT,
        startDate TEXT,
        renewalDate TEXT,
        color TEXT,
        currency TEXT,
        isTrial INTEGER,
        icon TEXT
      );
    `);

    // Check if table is empty
    const rows = await db.getAllAsync<DBSubscriptionRow>('SELECT * FROM subscriptions');
    if (rows.length === 0) {
      // Seed with default subscriptions from constants/data
      for (const sub of HOME_SUBSCRIPTIONS) {
        const isTrialVal = sub.isTrial ? 1 : 0;
        const iconKey = getIconKey(sub.icon);
        await db.runAsync(
          `INSERT INTO subscriptions (id, name, price, billing, category, plan, paymentMethod, status, startDate, renewalDate, color, currency, isTrial, icon)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sub.id,
            sub.name,
            sub.price,
            sub.billing,
            sub.category || null,
            sub.plan || null,
            sub.paymentMethod || null,
            sub.status || null,
            sub.startDate || null,
            sub.renewalDate || null,
            sub.color || null,
            sub.currency || null,
            isTrialVal,
            iconKey
          ]
        );
      }
      const seededRows = await db.getAllAsync<DBSubscriptionRow>('SELECT * FROM subscriptions');
      subscriptions = seededRows.map(mapRowToSubscription);
    } else {
      subscriptions = rows.map(mapRowToSubscription);
    }
  } catch (error) {
    console.error('SQLite database initialization error:', error);
  } finally {
    isLoading = false;
    isLoaded = true;
    emit();
  }
};

// Start DB loading immediately in background
initDatabase();

export const getSubscriptions = () => subscriptions;

export const updateSubscription = async (id: string, updatedSub: Subscription) => {
  const previousSub = subscriptions.find(s => s.id === id);

  // Optimistic memory update
  subscriptions = subscriptions.map(s => s.id === id ? updatedSub : s);
  
  emit();

  try {
    const isTrialVal = updatedSub.isTrial ? 1 : 0;
    const iconKey = getIconKey(updatedSub.icon);
    
    await db.runAsync(
      `UPDATE subscriptions SET 
        name = ?, 
        price = ?, 
        billing = ?, 
        category = ?, 
        plan = ?, 
        paymentMethod = ?, 
        status = ?, 
        startDate = ?, 
        renewalDate = ?, 
        color = ?, 
        currency = ?, 
        isTrial = ?, 
        icon = ?
       WHERE id = ?`,
      [
        updatedSub.name,
        updatedSub.price,
        updatedSub.billing,
        updatedSub.category || null,
        updatedSub.plan || null,
        updatedSub.paymentMethod || null,
        updatedSub.status || null,
        updatedSub.startDate || null,
        updatedSub.renewalDate || null,
        updatedSub.color || null,
        updatedSub.currency || null,
        isTrialVal,
        iconKey,
        id
      ]
    );
  } catch (error) {
    console.error('Failed to update subscription in SQLite:', error);
    if (previousSub) {
      subscriptions = subscriptions.map(s => s.id === id ? previousSub : s);
      emit();
    }
    throw error;
  }
};

export const deleteSubscription = async (id: string) => {
  const previousSub = subscriptions.find(s => s.id === id);
  const previousIndex = subscriptions.findIndex(s => s.id === id);

  // Optimistic memory update
  subscriptions = subscriptions.filter(s => s.id !== id);
  
  emit();

  try {
    await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete subscription from SQLite:', error);
    if (previousSub && previousIndex > -1) {
      const newSubs = [...subscriptions];
      newSubs.splice(previousIndex, 0, previousSub);
      subscriptions = newSubs;
      emit();
    }
    throw error;
  }
};

export const addSubscription = async (newSub: Subscription) => {
  // Optimistic memory update
  subscriptions = [newSub, ...subscriptions];
  emit();

  try {
    const isTrialVal = newSub.isTrial ? 1 : 0;
    const iconKey = getIconKey(newSub.icon);
    
    await db.runAsync(
      `INSERT INTO subscriptions (id, name, price, billing, category, plan, paymentMethod, status, startDate, renewalDate, color, currency, isTrial, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSub.id,
        newSub.name,
        newSub.price,
        newSub.billing,
        newSub.category || null,
        newSub.plan || null,
        newSub.paymentMethod || null,
        newSub.status || null,
        newSub.startDate || null,
        newSub.renewalDate || null,
        newSub.color || null,
        newSub.currency || null,
        isTrialVal,
        iconKey
      ]
    );
  } catch (error) {
    console.error('Failed to add subscription to SQLite:', error);
  }
};

export const useSubscriptions = () => {
  const [state, setState] = useState(subscriptions);

  useEffect(() => {
    if (!isLoaded) {
      initDatabase();
    }
    
    const handleUpdate = () => {
      setState(subscriptions);
    };
    
    listeners.add(handleUpdate);
    
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return state;
};
