/**
 * Storage Abstraction Layer
 *
 * This interface allows switching between different storage backends:
 * - localStorage (default, client-side only)
 * - IndexedDB (for larger data)
 * - PostgreSQL/REST API (for server-side persistence)
 *
 * To add a new storage backend:
 * 1. Implement the StorageProvider interface
 * 2. Register it with setStorageProvider()
 */

import type { AppConfig, ConversionHistoryItem } from "./config-storage";

// Storage provider interface
export interface StorageProvider {
  // Config operations
  getConfig(): Promise<AppConfig | null>;
  saveConfig(config: AppConfig): Promise<boolean>;
  deleteConfig(): Promise<boolean>;

  // History operations
  getHistory(): Promise<ConversionHistoryItem[]>;
  addHistoryItem(item: Omit<ConversionHistoryItem, "id" | "timestamp">): Promise<ConversionHistoryItem>;
  deleteHistoryItem(id: string): Promise<boolean>;
  clearHistory(): Promise<boolean>;

  // Provider info
  getName(): string;
  isAvailable(): boolean;
}

// Current storage provider
let currentProvider: StorageProvider | null = null;

/**
 * Get the current storage provider
 */
export function getStorageProvider(): StorageProvider {
  if (!currentProvider) {
    // Default to localStorage provider
    currentProvider = createLocalStorageProvider();
  }
  return currentProvider;
}

/**
 * Set a custom storage provider
 */
export function setStorageProvider(provider: StorageProvider): void {
  currentProvider = provider;
}

/**
 * Create a localStorage-based storage provider
 */
export function createLocalStorageProvider(): StorageProvider {
  const CONFIG_KEY = "oflair_config";
  const HISTORY_KEY = "oflair_conversion_history";

  // Import default config here to avoid circular dependency
  const DEFAULT_CONFIG: AppConfig = {
    defaultOwner: "airflow",
    defaultRetries: 1,
    defaultRetryDelay: 5,
    dagIdPrefix: "",
    dagIdSuffix: "_dag",
    includeComments: true,
  };

  return {
    getName: () => "localStorage",

    isAvailable: () => typeof window !== "undefined" && !!window.localStorage,

    getConfig: async () => {
      if (typeof window === "undefined") return null;
      try {
        const stored = localStorage.getItem(CONFIG_KEY);
        if (stored) {
          return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        }
        return DEFAULT_CONFIG;
      } catch {
        return DEFAULT_CONFIG;
      }
    },

    saveConfig: async (config: AppConfig) => {
      if (typeof window === "undefined") return false;
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        return true;
      } catch {
        return false;
      }
    },

    deleteConfig: async () => {
      if (typeof window === "undefined") return false;
      try {
        localStorage.removeItem(CONFIG_KEY);
        return true;
      } catch {
        return false;
      }
    },

    getHistory: async () => {
      if (typeof window === "undefined") return [];
      try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
          const items = JSON.parse(stored);
          return items.map((item: ConversionHistoryItem) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
        }
        return [];
      } catch {
        return [];
      }
    },

    addHistoryItem: async (item) => {
      if (typeof window === "undefined") {
        throw new Error("localStorage not available");
      }

      const history = await currentProvider!.getHistory();
      const newItem: ConversionHistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      history.push(newItem);

      // Keep only last 100 items
      const trimmed = history.slice(-100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      return newItem;
    },

    deleteHistoryItem: async (id: string) => {
      if (typeof window === "undefined") return false;
      try {
        const history = await currentProvider!.getHistory();
        const filtered = history.filter((item) => item.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
        return true;
      } catch {
        return false;
      }
    },

    clearHistory: async () => {
      if (typeof window === "undefined") return false;
      try {
        localStorage.removeItem(HISTORY_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create an IndexedDB-based storage provider (for larger data)
 * This is a placeholder for future implementation
 */
export function createIndexedDBProvider(): StorageProvider {
  // Placeholder - implement when needed
  throw new Error("IndexedDB provider not implemented yet");
}

/**
 * Create a REST API-based storage provider
 * This is a placeholder for future implementation
 *
 * Example usage:
 * ```typescript
 * const apiProvider = createAPIProvider({
 *   baseUrl: '/api/storage',
 *   headers: { 'Authorization': 'Bearer ...' }
 * });
 * setStorageProvider(apiProvider);
 * ```
 */
export interface APIProviderOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

export function createAPIProvider(options: APIProviderOptions): StorageProvider {
  const { baseUrl, headers = {} } = options;

  const fetchAPI = (url: string, init?: RequestInit) =>
    fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...init?.headers,
      },
    });

  return {
    getName: () => "api",

    isAvailable: () => typeof window !== "undefined",

    getConfig: async () => {
      try {
        const res = await fetchAPI(`${baseUrl}/config`);
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },

    saveConfig: async (config) => {
      try {
        const res = await fetchAPI(`${baseUrl}/config`, {
          method: "PUT",
          body: JSON.stringify(config),
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    deleteConfig: async () => {
      try {
        const res = await fetchAPI(`${baseUrl}/config`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    },

    getHistory: async () => {
      try {
        const res = await fetchAPI(`${baseUrl}/history`);
        if (!res.ok) return [];
        const items = await res.json();
        return items.map((item: ConversionHistoryItem) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      } catch {
        return [];
      }
    },

    addHistoryItem: async (item) => {
      const res = await fetchAPI(`${baseUrl}/history`, {
        method: "POST",
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error("Failed to add history item");
      const created = await res.json();
      return { ...created, timestamp: new Date(created.timestamp) };
    },

    deleteHistoryItem: async (id) => {
      try {
        const res = await fetchAPI(`${baseUrl}/history?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    clearHistory: async () => {
      try {
        const res = await fetchAPI(`${baseUrl}/history`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// Type exports
export type { AppConfig, ConversionHistoryItem };
