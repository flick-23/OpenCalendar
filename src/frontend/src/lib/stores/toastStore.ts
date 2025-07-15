/**
 * Toast Store - Manages temporary notification messages
 * 
 * This store provides a centralized way to display temporary notifications
 * such as success messages, errors, warnings, and info messages.
 */

import { writable, type Writable } from 'svelte/store';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 for persistent
  dismissible?: boolean;
  timestamp: number;
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: []
};

// Auto-incrementing ID for toasts
let toastId = 0;

// Create the store
export const toastStore: Writable<ToastState> & {
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (title: string, message: string, duration?: number) => string;
  error: (title: string, message: string, duration?: number) => string;
  warning: (title: string, message: string, duration?: number) => string;
  info: (title: string, message: string, duration?: number) => string;
} = (() => {
  const store = writable<ToastState>(initialState);

  // Auto-dismiss timers
  const timers = new Map<string, NodeJS.Timeout>();

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    addToast: (toastData: Omit<Toast, 'id' | 'timestamp'>): string => {
      const id = `toast-${++toastId}`;
      const toast: Toast = {
        ...toastData,
        id,
        timestamp: Date.now(),
        dismissible: toastData.dismissible !== false, // Default to true
        duration: toastData.duration !== undefined ? toastData.duration : 5000 // Default 5 seconds
      };

      // Add to store
      store.update(state => ({
        ...state,
        toasts: [...state.toasts, toast]
      }));

      // Set up auto-dismiss timer if duration > 0
      if (toast.duration && toast.duration > 0) {
        const timer = setTimeout(() => {
          toastStore.removeToast(id);
        }, toast.duration);
        timers.set(id, timer);
      }

      return id;
    },

    removeToast: (id: string): void => {
      // Clear timer if exists
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }

      // Remove from store
      store.update(state => ({
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== id)
      }));
    },

    clearAll: (): void => {
      // Clear all timers
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();

      // Clear store
      store.update(state => ({
        ...state,
        toasts: []
      }));
    },

    // Convenience methods
    success: (title: string, message: string, duration = 4000): string => {
      return toastStore.addToast({
        type: 'success',
        title,
        message,
        duration
      });
    },

    error: (title: string, message: string, duration = 7000): string => {
      return toastStore.addToast({
        type: 'error',
        title,
        message,
        duration
      });
    },

    warning: (title: string, message: string, duration = 5000): string => {
      return toastStore.addToast({
        type: 'warning',
        title,
        message,
        duration
      });
    },

    info: (title: string, message: string, duration = 4000): string => {
      return toastStore.addToast({
        type: 'info',
        title,
        message,
        duration
      });
    }
  };
})();

console.log('Toast store initialized');
