import { useState, useEffect } from 'react';
import { HOME_SUBSCRIPTIONS } from '@/constants/data';

let subscriptions = [...HOME_SUBSCRIPTIONS];
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach(l => l());
};

export const getSubscriptions = () => subscriptions;

export const updateSubscription = (id: string, updatedSub: Subscription) => {
  subscriptions = subscriptions.map(s => s.id === id ? updatedSub : s);
  
  // Keep the raw array updated as well in case other external files read from it directly
  const index = HOME_SUBSCRIPTIONS.findIndex(s => s.id === id);
  if (index > -1) {
    HOME_SUBSCRIPTIONS[index] = updatedSub;
  }
  
  emit();
};

export const deleteSubscription = (id: string) => {
  subscriptions = subscriptions.filter(s => s.id !== id);
  
  const index = HOME_SUBSCRIPTIONS.findIndex(s => s.id === id);
  if (index > -1) {
    HOME_SUBSCRIPTIONS.splice(index, 1);
  }
  
  emit();
};

export const addSubscription = (newSub: Subscription) => {
  subscriptions = [newSub, ...subscriptions];
  
  HOME_SUBSCRIPTIONS.unshift(newSub);
  
  emit();
};

export const useSubscriptions = () => {
  const [state, setState] = useState(subscriptions);

  useEffect(() => {
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
