// Config Storage using localStorage
// Since we can't connect to Database, use localStorage instead

export interface AppConfig {
  // DAG defaults
  defaultOwner: string;
  defaultRetries: number;
  defaultRetryDelay: number;
  defaultSchedule: string;
  catchup: boolean;

  // Naming conventions
  dagIdPrefix: string;
  dagIdSuffix: string;
  taskIdCase: "lowercase" | "original";

  // Output format
  pythonVersion: string;
  airflowVersion: string;
  useTaskFlowApi: boolean;
  includeComments: boolean;
  includeDocstrings: boolean;
}

export interface ConversionHistoryItem {
  id: string;
  timestamp: Date;
  sourceFile: string;
  sourceType: "xml" | "json";
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
  defaultSchedule: "None",
  catchup: false,
  dagIdPrefix: "",
  dagIdSuffix: "_dag",
  taskIdCase: "lowercase",
  pythonVersion: "3.9",
  airflowVersion: "3.1",
  useTaskFlowApi: false,
  includeComments: true,
  includeDocstrings: true,
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
