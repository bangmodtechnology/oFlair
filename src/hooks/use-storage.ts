"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStorageProvider,
  setStorageProvider,
  createLocalStorageProvider,
  createAPIProvider,
  type StorageProvider,
} from "@/lib/storage/storage-interface";

export type StorageMode = "local" | "database";

const STORAGE_MODE_KEY = "oflair_storage_mode";

/**
 * Detect if running inside Tauri WebView
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Hook to manage the storage mode (local vs database)
 */
export function useStorageMode() {
  const [mode, setModeState] = useState<StorageMode>("local");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // In Tauri, always use local storage (no API routes available)
    if (isTauriEnvironment()) {
      setModeState("local");
      return;
    }

    const stored = localStorage.getItem(STORAGE_MODE_KEY) as StorageMode | null;
    if (stored === "database") {
      setModeState("database");
      setStorageProvider(createAPIProvider({ baseUrl: "/api" }));
    }
  }, []);

  const setMode = useCallback((newMode: StorageMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_MODE_KEY, newMode);
    }
    if (newMode === "database") {
      setStorageProvider(createAPIProvider({ baseUrl: "/api" }));
    } else {
      setStorageProvider(createLocalStorageProvider());
    }
  }, []);

  return { mode, setMode };
}

/**
 * Hook to get the current storage provider
 */
export function useStorage(): StorageProvider {
  return getStorageProvider();
}
