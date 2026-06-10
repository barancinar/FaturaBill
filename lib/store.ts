import { useState, useEffect } from 'react';
import { HOME_SUBSCRIPTIONS } from '@/constants/data';
import { icons, IconKey } from '@/constants/icons';
import * as SQLite from 'expo-sqlite';

import NetInfo from '@react-native-community/netinfo';
import { getSupabaseClient } from './supabase';
import { bindSettingsAuth } from './settingsStore';

// Open the database synchronously
const db = SQLite.openDatabaseSync('faturabill.db');

let subscriptions: Subscription[] = [];
let isLoaded = false;
let isLoading = true;

let currentUserId: string | null = null;
let clerkToken: string | null = null;
let getTokenCallback: (() => Promise<string | null>) | null = null;
let isSyncing = false;

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach(l => l());
};

export interface DBSubscriptionRow {
  id: string;
  userId: string | null;
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
  synced: number | null;
  deleted: number | null;
  updatedAt: string | null;
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
        userId TEXT,
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
        icon TEXT,
        synced INTEGER DEFAULT 1,
        deleted INTEGER DEFAULT 0,
        updatedAt TEXT
      );
    `);

    // Schema Migrations (Add new columns dynamically if database already exists)
    try {
      await db.execAsync('ALTER TABLE subscriptions ADD COLUMN userId TEXT;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.execAsync('ALTER TABLE subscriptions ADD COLUMN synced INTEGER DEFAULT 1;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.execAsync('ALTER TABLE subscriptions ADD COLUMN deleted INTEGER DEFAULT 0;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.execAsync('ALTER TABLE subscriptions ADD COLUMN updatedAt TEXT;');
    } catch (e) { /* Column already exists */ }

    // Update existing entries to have valid updatedAt date if empty
    await db.runAsync(
      "UPDATE subscriptions SET updatedAt = ? WHERE updatedAt IS NULL",
      [new Date().toISOString()]
    );

    // Check if the entire table is empty to prevent UNIQUE constraint errors when seeding
    const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM subscriptions');
    const isTableEmpty = !countResult || countResult.count === 0;

    if (isTableEmpty && !currentUserId) {
      // Seed with default subscriptions from constants/data
      for (const sub of HOME_SUBSCRIPTIONS) {
        const isTrialVal = sub.isTrial ? 1 : 0;
        const iconKey = getIconKey(sub.icon);
        await db.runAsync(
          `INSERT INTO subscriptions (id, userId, name, price, billing, category, plan, paymentMethod, status, startDate, renewalDate, color, currency, isTrial, icon, synced, deleted, updatedAt)
           VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
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
            iconKey,
            new Date().toISOString()
          ]
        );
      }
    }

    // Filter by userId if set, otherwise fetch local rows
    const activeUserFilter = currentUserId || 'local';
    const rows = await db.getAllAsync<DBSubscriptionRow>(
      'SELECT * FROM subscriptions WHERE (userId = ? OR userId IS NULL) AND deleted = 0',
      [activeUserFilter]
    );
    subscriptions = rows.map(mapRowToSubscription);
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

// Listen for connection status changes to sync automatically when coming back online
NetInfo.addEventListener(state => {
  if (state.isConnected && currentUserId) {
    console.log('[Sync] Network connection restored. Auto-triggering sync.');
    triggerSync();
  }
});

export const getSubscriptions = () => subscriptions;

export const setAuthSession = async (
  userId: string | null,
  getTokenFn: (() => Promise<string | null>) | null
) => {
  currentUserId = userId;
  getTokenCallback = getTokenFn;
  clerkToken = null; // Clear cached token to force refresh

  // Bind settings authentication context to trigger Supabase budget loading
  bindSettingsAuth(userId, getTokenFn);

  if (userId) {
    try {
      // 1. Associate local subscriptions (seeding/offline created) with the logged-in user
      await db.runAsync(
        "UPDATE subscriptions SET userId = ?, synced = 0 WHERE userId IS NULL OR userId = 'local'",
        [userId]
      );

      // 2. Load the subscriptions for the new user from SQLite
      const rows = await db.getAllAsync<DBSubscriptionRow>(
        'SELECT * FROM subscriptions WHERE userId = ? AND deleted = 0',
        [userId]
      );
      subscriptions = rows.map(mapRowToSubscription);
      emit();

      // Get initial token and trigger sync
      if (getTokenFn) {
        clerkToken = await getTokenFn();
      }
      triggerSync(userId, clerkToken);
    } catch (error) {
      console.error('Error binding local database to authenticated user:', error);
    }
  } else {
    // Logout: Clear active memory context
    await clearLocalStore();
  }
};

export const clearLocalStore = async () => {
  currentUserId = null;
  clerkToken = null;
  getTokenCallback = null;
  subscriptions = [];
  emit();
};

// --- SYNC ENGINE (PUSH / PULL) ---
export const triggerSync = async (userId?: string | null, token?: string | null) => {
  const activeUserId = userId || currentUserId;
  let activeToken = token;

  if (!activeUserId) {
    console.log('[Sync] Sync aborted: missing user authentication context.');
    return;
  }

  // Always refresh token dynamically if callback is present to prevent JWT expiration (401)
  if (getTokenCallback) {
    try {
      activeToken = await getTokenCallback();
      clerkToken = activeToken; // update cache
    } catch (err) {
      console.error('[Sync] Failed to refresh Clerk token dynamically:', err);
    }
  }

  // Fallback to cached token if callback failed or wasn't provided (e.g. initial load parameter)
  if (!activeToken) {
    activeToken = token || clerkToken;
  }

  if (!activeToken) {
    console.log('[Sync] Sync aborted: missing auth token.');
    return;
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    console.log('[Sync] Sync aborted: device is currently offline.');
    return;
  }

  if (isSyncing) {
    console.log('[Sync] Sync aborted: another sync process is already running.');
    return;
  }

  isSyncing = true;
  console.log('[Sync] Running background synchronization pipeline...');

  try {
    const supabase = getSupabaseClient(activeToken);

    // 1. PUSH PHASE: Sync locally added/updated subscriptions
    const unsyncedRows = await db.getAllAsync<DBSubscriptionRow>(
      'SELECT * FROM subscriptions WHERE userId = ? AND synced = 0 AND deleted = 0',
      [activeUserId]
    );

    for (const row of unsyncedRows) {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          id: row.id,
          user_id: activeUserId,
          name: row.name,
          price: row.price,
          billing: row.billing,
          category: row.category,
          plan: row.plan,
          payment_method: row.paymentMethod,
          status: row.status,
          start_date: row.startDate,
          renewal_date: row.renewalDate,
          color: row.color,
          currency: row.currency,
          is_trial: row.isTrial === 1,
          icon: row.icon,
          updated_at: row.updatedAt || new Date().toISOString()
        });

      if (!error) {
        await db.runAsync('UPDATE subscriptions SET synced = 1 WHERE id = ?', [row.id]);
      } else {
        console.error('[Sync] Failed to push row:', row.id, error);
      }
    }

    // 2. PUSH PHASE: Process locally deleted subscriptions (Soft Deleted)
    const softDeletedRows = await db.getAllAsync<DBSubscriptionRow>(
      'SELECT * FROM subscriptions WHERE userId = ? AND deleted = 1',
      [activeUserId]
    );

    for (const row of softDeletedRows) {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', row.id);

      if (!error) {
        await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [row.id]);
      } else {
        console.error('[Sync] Failed to push deletion for row:', row.id, error);
      }
    }

    // 3. PULL PHASE: Retrieve changes from Supabase
    const { data: cloudSubs, error: pullError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', activeUserId);

    if (pullError) throw pullError;

    if (cloudSubs) {
      for (const cloudSub of cloudSubs) {
        const localSub = await db.getFirstAsync<DBSubscriptionRow>(
          'SELECT * FROM subscriptions WHERE id = ?',
          [cloudSub.id]
        );

        const isTrialNum = cloudSub.is_trial ? 1 : 0;

        if (!localSub) {
          // Row does not exist locally, download it
          await db.runAsync(
            `INSERT INTO subscriptions (id, userId, name, price, billing, category, plan, paymentMethod, status, startDate, renewalDate, color, currency, isTrial, icon, synced, deleted, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
            [
              cloudSub.id,
              activeUserId,
              cloudSub.name,
              cloudSub.price,
              cloudSub.billing,
              cloudSub.category,
              cloudSub.plan,
              cloudSub.payment_method,
              cloudSub.status,
              cloudSub.start_date,
              cloudSub.renewal_date,
              cloudSub.color,
              cloudSub.currency,
              isTrialNum,
              cloudSub.icon,
              cloudSub.updated_at
            ]
          );
        } else {
          // Resolve Conflict: Compare timestamps (Last-Write-Wins)
          const localTime = localSub.updatedAt ? new Date(localSub.updatedAt).getTime() : 0;
          const rawCloudTime = cloudSub.updated_at ? new Date(cloudSub.updated_at).getTime() : 0;
          const cloudTime = isNaN(rawCloudTime) ? 0 : rawCloudTime;

          if (cloudTime > localTime) {
            // Cloud is newer, overwrite local cache
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
                icon = ?,
                synced = 1,
                deleted = 0,
                updatedAt = ?
               WHERE id = ?`,
              [
                cloudSub.name,
                cloudSub.price,
                cloudSub.billing,
                cloudSub.category,
                cloudSub.plan,
                cloudSub.payment_method,
                cloudSub.status,
                cloudSub.start_date,
                cloudSub.renewal_date,
                cloudSub.color,
                cloudSub.currency,
                isTrialNum,
                cloudSub.icon,
                cloudSub.updated_at,
                cloudSub.id
              ]
            );
          }
        }
      }

      // 4. CLEANUP PHASE: Remove local synced items that have been deleted from the cloud database
      const localSyncedSubs = await db.getAllAsync<DBSubscriptionRow>(
        'SELECT id FROM subscriptions WHERE userId = ? AND synced = 1 AND deleted = 0',
        [activeUserId]
      );
      const cloudIds = new Set(cloudSubs.map(s => s.id));
      for (const localSub of localSyncedSubs) {
        if (!cloudIds.has(localSub.id)) {
          await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [localSub.id]);
        }
      }
    }

    // Refresh active memory cache and trigger UI re-renders
    const finalRows = await db.getAllAsync<DBSubscriptionRow>(
      'SELECT * FROM subscriptions WHERE userId = ? AND deleted = 0',
      [activeUserId]
    );
    subscriptions = finalRows.map(mapRowToSubscription);
    emit();

    console.log('[Sync] Background sync successfully completed.');
  } catch (syncError) {
    console.error('[Sync] Sync pipeline encountered an error:', syncError);
  } finally {
    isSyncing = false;
  }
};

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
        icon = ?,
        synced = 0,
        updatedAt = ?
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
        new Date().toISOString(),
        id
      ]
    );

    // Fire non-blocking sync in background
    triggerSync();
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
    const row = await db.getFirstAsync<DBSubscriptionRow>(
      'SELECT synced FROM subscriptions WHERE id = ?',
      [id]
    );

    if (row && row.synced === 0) {
      // Never synced to cloud database: delete locally immediately
      await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
    } else {
      // Exists in cloud: mark as deleted locally and enqueue for cloud sync delete
      await db.runAsync(
        'UPDATE subscriptions SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    }

    // Fire non-blocking sync in background
    triggerSync();
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
      `INSERT INTO subscriptions (id, userId, name, price, billing, category, plan, paymentMethod, status, startDate, renewalDate, color, currency, isTrial, icon, synced, deleted, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      [
        newSub.id,
        currentUserId || 'local',
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
        iconKey,
        new Date().toISOString()
      ]
    );

    // Fire non-blocking sync in background
    triggerSync();
  } catch (error) {
    console.error('Failed to add subscription to SQLite:', error);
    subscriptions = subscriptions.filter(s => s.id !== newSub.id);
    emit();
    throw error;
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
