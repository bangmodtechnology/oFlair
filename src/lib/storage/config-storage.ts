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

  // Custom rules (stored separately for size management)
  customRulesEnabled?: boolean;
}

/**
 * Custom rule for transforming values during conversion
 */
export interface CustomRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number; // Higher = applied first

  // Rule type
  type: "value_replace" | "field_mapping" | "regex_transform" | "conditional";

  // Configuration based on type
  config: CustomRuleConfig;
}

export type CustomRuleConfig =
  | ValueReplaceConfig
  | FieldMappingConfig
  | RegexTransformConfig
  | ConditionalConfig;

/**
 * Replace a value with another across specified fields
 */
export interface ValueReplaceConfig {
  type: "value_replace";
  searchValue: string;
  replaceValue: string;
  caseSensitive?: boolean;
  targetFields?: string[]; // If empty, apply to all text fields
}

/**
 * Map specific field values to new values (lookup table)
 */
export interface FieldMappingConfig {
  type: "field_mapping";
  sourceField: string;
  mappings: { from: string; to: string }[];
  defaultValue?: string;
}

/**
 * Apply regex transformation to field values
 */
export interface RegexTransformConfig {
  type: "regex_transform";
  targetField: string;
  pattern: string;
  replacement: string;
  flags?: string; // e.g., "gi" for global case-insensitive
}

/**
 * Conditional rule: if condition matches, apply transformation
 */
export interface ConditionalConfig {
  type: "conditional";
  condition: {
    field: string;
    operator: "equals" | "contains" | "starts_with" | "ends_with" | "regex";
    value: string;
  };
  thenAction: {
    targetField: string;
    action: "set" | "append" | "prepend" | "replace";
    value: string;
  };
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
  // Store generated DAG files for view/download from history
  generatedDags?: {
    filename: string;
    content: string;
    dagId: string;
  }[];
}

/**
 * Calendar configuration for holiday/business day scheduling
 */
export interface CalendarEntry {
  id: string;
  name: string;
  description?: string;
  type: "business_days" | "holidays" | "custom" | "weekly_pattern";
  isActive: boolean;
  // For holidays type: list of excluded dates
  excludedDates?: string[]; // ISO format: "2024-12-25"
  // For business_days/weekly_pattern: pattern string
  pattern?: string; // e.g., "MON-FRI", "MON,WED,FRI"
  // For custom: included dates
  includedDates?: string[];
  // Timezone
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CONFIG_KEY = "oflair_config";
const HISTORY_KEY = "oflair_conversion_history";
const CUSTOM_RULES_KEY = "oflair_custom_rules";
const CALENDARS_KEY = "oflair_calendars";

export const DEFAULT_CONFIG: AppConfig = {
  defaultOwner: "airflow",
  defaultRetries: 1,
  defaultRetryDelay: 5,
  dagIdPrefix: "",
  dagIdSuffix: "_dag",
  includeComments: true,
  customRulesEnabled: true,
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

// Custom Rules functions
export function loadCustomRules(): CustomRule[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(CUSTOM_RULES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load custom rules:", error);
  }

  return [];
}

export function saveCustomRules(rules: CustomRule[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(CUSTOM_RULES_KEY, JSON.stringify(rules));
    return true;
  } catch (error) {
    console.error("Failed to save custom rules:", error);
    return false;
  }
}

export function addCustomRule(rule: Omit<CustomRule, "id">): CustomRule {
  const rules = loadCustomRules();
  const newRule: CustomRule = {
    ...rule,
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
  rules.push(newRule);
  saveCustomRules(rules);
  return newRule;
}

export function updateCustomRule(id: string, updates: Partial<CustomRule>): boolean {
  const rules = loadCustomRules();
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) return false;

  rules[index] = { ...rules[index], ...updates };
  return saveCustomRules(rules);
}

export function deleteCustomRule(id: string): boolean {
  const rules = loadCustomRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;
  return saveCustomRules(filtered);
}

export function getActiveCustomRules(): CustomRule[] {
  return loadCustomRules()
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority);
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

// Calendar functions
export function loadCalendars(): CalendarEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(CALENDARS_KEY);
    if (stored) {
      const items = JSON.parse(stored);
      return items.map((item: CalendarEntry) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      }));
    }
  } catch (error) {
    console.error("Failed to load calendars:", error);
  }

  return [];
}

export function saveCalendars(calendars: CalendarEntry[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars));
    return true;
  } catch (error) {
    console.error("Failed to save calendars:", error);
    return false;
  }
}

export function addCalendar(calendar: Omit<CalendarEntry, "id" | "createdAt" | "updatedAt">): CalendarEntry {
  const calendars = loadCalendars();
  const now = new Date();
  const newCalendar: CalendarEntry = {
    ...calendar,
    id: `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };
  calendars.push(newCalendar);
  saveCalendars(calendars);
  return newCalendar;
}

export function updateCalendar(id: string, updates: Partial<CalendarEntry>): boolean {
  const calendars = loadCalendars();
  const index = calendars.findIndex((c) => c.id === id);
  if (index === -1) return false;

  calendars[index] = {
    ...calendars[index],
    ...updates,
    updatedAt: new Date(),
  };
  return saveCalendars(calendars);
}

export function deleteCalendar(id: string): boolean {
  const calendars = loadCalendars();
  const filtered = calendars.filter((c) => c.id !== id);
  if (filtered.length === calendars.length) return false;
  return saveCalendars(filtered);
}

export function getActiveCalendars(): CalendarEntry[] {
  return loadCalendars().filter((c) => c.isActive);
}

export function getCalendarById(id: string): CalendarEntry | null {
  const calendars = loadCalendars();
  return calendars.find((c) => c.id === id) || null;
}

/**
 * Get sample calendars for demonstration
 */
export function getSampleCalendars(): Omit<CalendarEntry, "id" | "createdAt" | "updatedAt">[] {
  return [
    {
      name: "US Holidays 2024",
      description: "US Federal holidays for 2024",
      type: "holidays",
      isActive: false,
      excludedDates: [
        "2024-01-01", // New Year's Day
        "2024-01-15", // MLK Day
        "2024-02-19", // Presidents' Day
        "2024-05-27", // Memorial Day
        "2024-06-19", // Juneteenth
        "2024-07-04", // Independence Day
        "2024-09-02", // Labor Day
        "2024-10-14", // Columbus Day
        "2024-11-11", // Veterans Day
        "2024-11-28", // Thanksgiving
        "2024-12-25", // Christmas
      ],
      timezone: "America/New_York",
    },
    {
      name: "Business Days (Mon-Fri)",
      description: "Standard business days Monday to Friday",
      type: "business_days",
      isActive: false,
      pattern: "MON-FRI",
      timezone: "UTC",
    },
    {
      name: "Weekend Only",
      description: "Run only on weekends",
      type: "weekly_pattern",
      isActive: false,
      pattern: "SAT,SUN",
      timezone: "UTC",
    },
  ];
}
