/**
 * Rules Engine - Transformation functions inspired by dagify
 * Provides various transformation rules for converting Control-M attributes to Airflow
 */

export type RuleType =
  | "lowercase"
  | "uppercase"
  | "python_variable_safe"
  | "escape_quotes"
  | "prefix"
  | "suffix"
  | "replace"
  | "trim"
  | "default"
  | "lookup";

export interface RuleConfig {
  type: RuleType;
  params?: Record<string, string>;
}

/**
 * Rules class - applies transformation rules to values
 */
export class Rules {
  /**
   * Apply a rule to a value
   */
  static apply(value: string | undefined, rule: RuleConfig): string {
    if (value === undefined || value === null) {
      if (rule.type === "default" && rule.params?.value) {
        return rule.params.value;
      }
      return "";
    }

    switch (rule.type) {
      case "lowercase":
        return this.lowercase(value);
      case "uppercase":
        return this.uppercase(value);
      case "python_variable_safe":
        return this.pythonVariableSafe(value);
      case "escape_quotes":
        return this.escapeQuotes(value);
      case "prefix":
        return this.prefix(value, rule.params?.prefix || "");
      case "suffix":
        return this.suffix(value, rule.params?.suffix || "");
      case "replace":
        return this.replace(
          value,
          rule.params?.from || "",
          rule.params?.to || ""
        );
      case "trim":
        return this.trim(value);
      case "default":
        return value || rule.params?.value || "";
      case "lookup":
        return this.lookup(value, rule.params || {});
      default:
        return value;
    }
  }

  /**
   * Apply multiple rules in sequence
   */
  static applyChain(value: string | undefined, rules: RuleConfig[]): string {
    let result = value || "";
    for (const rule of rules) {
      result = this.apply(result, rule);
    }
    return result;
  }

  /**
   * Convert to lowercase
   */
  static lowercase(value: string): string {
    return value.toLowerCase();
  }

  /**
   * Convert to uppercase
   */
  static uppercase(value: string): string {
    return value.toUpperCase();
  }

  /**
   * Make string safe for Python variable names
   * - Convert to lowercase
   * - Replace special characters with underscore
   * - Ensure doesn't start with number
   * - Remove consecutive underscores
   */
  static pythonVariableSafe(value: string): string {
    let result = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    // If starts with number, prefix with underscore
    if (/^[0-9]/.test(result)) {
      result = "_" + result;
    }

    // If empty, return default
    if (!result) {
      result = "unnamed_task";
    }

    return result;
  }

  /**
   * Escape quotes for use in Python strings
   */
  static escapeQuotes(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/`/g, "\\`");
  }

  /**
   * Add prefix to value
   */
  static prefix(value: string, prefix: string): string {
    if (!prefix) return value;
    return `${prefix}_${value}`;
  }

  /**
   * Add suffix to value
   */
  static suffix(value: string, suffix: string): string {
    if (!suffix) return value;
    return `${value}_${suffix}`;
  }

  /**
   * Replace occurrences
   */
  static replace(value: string, from: string, to: string): string {
    if (!from) return value;
    return value.split(from).join(to);
  }

  /**
   * Trim whitespace
   */
  static trim(value: string): string {
    return value.trim();
  }

  /**
   * Lookup and replace based on mapping
   */
  static lookup(value: string, mapping: Record<string, string>): string {
    return mapping[value] || value;
  }

  /**
   * Generate unique ID suffix
   */
  static makeUnique(value: string): string {
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${value}_${suffix}`;
  }
}

/**
 * Pre-defined rule chains for common transformations
 */
export const RULE_CHAINS = {
  taskId: [
    { type: "python_variable_safe" as RuleType },
  ],
  dagId: [
    { type: "python_variable_safe" as RuleType },
    { type: "suffix" as RuleType, params: { suffix: "dag" } },
  ],
  bashCommand: [
    { type: "trim" as RuleType },
    { type: "escape_quotes" as RuleType },
  ],
  description: [
    { type: "trim" as RuleType },
    { type: "escape_quotes" as RuleType },
  ],
};
