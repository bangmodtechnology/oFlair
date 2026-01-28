// Config Storage using localStorage
// Since we can't connect to Database, use localStorage instead

export interface AppConfig {
  // DAG defaults
  defaultOwner: string;
  defaultRetries: number;
  defaultRetryDelay: number;

  // Naming conventions
  dagIdPrefix: string;
  dagIdSuffix: string;

  // Output options
  includeComments: boolean;
}

export interface ConversionHistoryItem {
  id: string;
  timestamp: Date;
  sourceFile: string;
  sourceType: "xml" | "json" | "batch";
  jobsConverted: {
    jobName: string;
    dagId: string;
    operator: string;
  }[];
  airflowVersion: string;
  status: "success" | "partial" | "failed";
}

const CONFIG_KEY = "oflair_config";
const HISTORY_KEY = "oflair_conversion_history";

export const DEFAULT_CONFIG: AppConfig = {
  defaultOwner: "airflow",
  defaultRetries: 1,
  defaultRetryDelay: 5,
  dagIdPrefix: "",
  dagIdSuffix: "_dag",
  includeComments: true,
};

// Config functions
export function loadConfig(): AppConfig {
  if (typeof window === "undefined") {
    return DEFAULT_CONFIG;
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  }

  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error("Failed to save config:", error);
    return false;
  }
}

export function resetConfig(): AppConfig {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONFIG_KEY);
  }
  return DEFAULT_CONFIG;
}

// History functions
export function loadConversionHistory(): ConversionHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      const items = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return items.map((item: ConversionHistoryItem) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    }
  } catch (error) {
    console.error("Failed to load conversion history:", error);
  }

  return [];
}

export function saveConversionHistory(history: ConversionHistoryItem[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    // Keep only last 100 items
    const trimmed = history.slice(-100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    console.error("Failed to save conversion history:", error);
    return false;
  }
}

export function addConversionToHistory(item: Omit<ConversionHistoryItem, "id" | "timestamp">): ConversionHistoryItem {
  const history = loadConversionHistory();
  const newItem: ConversionHistoryItem = {
    ...item,
    id: Date.now().toString(),
    timestamp: new Date(),
  };
  history.push(newItem);
  saveConversionHistory(history);
  return newItem;
}

export function clearConversionHistory(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch (error) {
    console.error("Failed to clear conversion history:", error);
    return false;
  }
}

// Export/Import functions

export interface ExportData {
  version: string;
  exportedAt: string;
  config: AppConfig;
  history?: ConversionHistoryItem[];
}

/**
 * Export settings to JSON string
 */
export function exportSettingsToJson(includeHistory: boolean = false): string {
  const config = loadConfig();
  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    config,
  };

  if (includeHistory) {
    exportData.history = loadConversionHistory();
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import settings from JSON string
 */
export function importSettingsFromJson(
  jsonString: string,
  options: { importConfig?: boolean; importHistory?: boolean } = { importConfig: true, importHistory: false }
): { success: boolean; error?: string; configImported?: boolean; historyImported?: number } {
  try {
    const data = JSON.parse(jsonString) as ExportData;

    // Validate structure
    if (!data.version || !data.config) {
      return { success: false, error: "Invalid export file format" };
    }

    let configImported = false;
    let historyImported = 0;

    // Import config
    if (options.importConfig && data.config) {
      const mergedConfig = { ...DEFAULT_CONFIG, ...data.config };
      saveConfig(mergedConfig);
      configImported = true;
    }

    // Import history
    if (options.importHistory && data.history && Array.isArray(data.history)) {
      const existingHistory = loadConversionHistory();
      const existingIds = new Set(existingHistory.map((h) => h.id));

      // Only add items that don't already exist
      const newItems = data.history.filter((item) => !existingIds.has(item.id));
      const mergedHistory = [...existingHistory, ...newItems];
      saveConversionHistory(mergedHistory);
      historyImported = newItems.length;
    }

    return { success: true, configImported, historyImported };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse JSON",
    };
  }
}

/**
 * Download settings as JSON file (browser only)
 */
export function downloadSettingsAsJson(
  filename: string = "oflair-settings.json",
  includeHistory: boolean = false
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const json = exportSettingsToJson(includeHistory);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Failed to download settings:", error);
    return false;
  }
}
