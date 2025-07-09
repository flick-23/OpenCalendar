import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface UserSettings {
  timezone: string;
  defaultView: 'day' | 'month' | 'year';
  theme: 'light' | 'dark' | 'auto';
  weekStartsOn: 'sunday' | 'monday';
  notifications: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  displayName: string;
  email: string;
}

const defaultSettings: UserSettings = {
  timezone: 'UTC',
  defaultView: 'month',
  theme: 'light',
  weekStartsOn: 'monday',
  notifications: true,
  emailNotifications: false,
  soundEnabled: true,
  displayName: '',
  email: '',
};

// Function to load settings from localStorage
function loadSettings(): UserSettings {
  if (!browser) return defaultSettings;

  try {
    const stored = localStorage.getItem('userSettings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  return defaultSettings;
}

// Function to save settings to localStorage
function saveSettings(settings: UserSettings) {
  if (!browser) return;

  try {
    localStorage.setItem('userSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
}

// Create the settings store
export const settingsStore: Writable<UserSettings> & {
  update: (updater: (settings: UserSettings) => UserSettings) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  reset: () => void;
} = (() => {
  const store = writable<UserSettings>(loadSettings());

  return {
    subscribe: store.subscribe,
    set: (value: UserSettings) => {
      store.set(value);
      saveSettings(value);
    },
    update: (updater: (settings: UserSettings) => UserSettings) => {
      store.update((settings) => {
        const newSettings = updater(settings);
        saveSettings(newSettings);
        return newSettings;
      });
    },
    updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      store.update((settings) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    reset: () => {
      store.set(defaultSettings);
      saveSettings(defaultSettings);
    }
  };
})();

// Helper functions to get specific settings
export const getDefaultView = () => {
  if (!browser) return 'month';
  return loadSettings().defaultView;
};

export const getTimezone = () => {
  if (!browser) return 'UTC';
  return loadSettings().timezone;
};

export const getTheme = () => {
  if (!browser) return 'light';
  return loadSettings().theme;
};

// Apply theme to document
export const applyTheme = (theme: string = getTheme()) => {
  if (!browser) return;
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};
