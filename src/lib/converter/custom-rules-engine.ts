/**
 * Custom Rules Engine
 * Applies user-defined transformation rules to Control-M jobs
 */

import type { ControlMJob } from "@/types/controlm";
import type {
  CustomRule,
  CustomRuleConfig,
  ValueReplaceConfig,
  FieldMappingConfig,
  RegexTransformConfig,
  ConditionalConfig,
} from "@/lib/storage/config-storage";

/**
 * Apply all active custom rules to a job
 */
export function applyCustomRules(
  job: ControlMJob,
  rules: CustomRule[]
): ControlMJob {
  // Clone the job to avoid mutations
  let result = JSON.parse(JSON.stringify(job)) as ControlMJob;

  // Apply rules in priority order (already sorted)
  for (const rule of rules) {
    if (!rule.isActive) continue;
    result = applyRule(result, rule);
  }

  return result;
}

/**
 * Apply a single rule to a job
 */
function applyRule(job: ControlMJob, rule: CustomRule): ControlMJob {
  switch (rule.config.type) {
    case "value_replace":
      return applyValueReplace(job, rule.config);
    case "field_mapping":
      return applyFieldMapping(job, rule.config);
    case "regex_transform":
      return applyRegexTransform(job, rule.config);
    case "conditional":
      return applyConditional(job, rule.config);
    default:
      return job;
  }
}

/**
 * Value Replace: Replace occurrences of a value in specified fields
 */
function applyValueReplace(job: ControlMJob, config: ValueReplaceConfig): ControlMJob {
  const result = { ...job };
  const { searchValue, replaceValue, caseSensitive, targetFields } = config;

  // Fields to check
  const fieldsToCheck = targetFields && targetFields.length > 0
    ? targetFields
    : ["CMDLINE", "DESCRIPTION", "FILENAME", "JOBNAME", "APPLICATION", "SUB_APPLICATION"];

  for (const field of fieldsToCheck) {
    const value = (result as Record<string, unknown>)[field];
    if (typeof value === "string") {
      if (caseSensitive) {
        (result as Record<string, unknown>)[field] = value.split(searchValue).join(replaceValue);
      } else {
        const regex = new RegExp(escapeRegex(searchValue), "gi");
        (result as Record<string, unknown>)[field] = value.replace(regex, replaceValue);
      }
    }
  }

  return result;
}

/**
 * Field Mapping: Map specific field values to new values
 */
function applyFieldMapping(job: ControlMJob, config: FieldMappingConfig): ControlMJob {
  const result = { ...job };
  const { sourceField, mappings, defaultValue } = config;

  const currentValue = (result as Record<string, unknown>)[sourceField];
  if (typeof currentValue !== "string") return result;

  // Find matching mapping
  const mapping = mappings.find(
    (m) => m.from.toLowerCase() === currentValue.toLowerCase()
  );

  if (mapping) {
    (result as Record<string, unknown>)[sourceField] = mapping.to;
  } else if (defaultValue !== undefined) {
    (result as Record<string, unknown>)[sourceField] = defaultValue;
  }

  return result;
}

/**
 * Regex Transform: Apply regex-based transformation
 */
function applyRegexTransform(job: ControlMJob, config: RegexTransformConfig): ControlMJob {
  const result = { ...job };
  const { targetField, pattern, replacement, flags } = config;

  const value = (result as Record<string, unknown>)[targetField];
  if (typeof value !== "string") return result;

  try {
    const regex = new RegExp(pattern, flags || "g");
    (result as Record<string, unknown>)[targetField] = value.replace(regex, replacement);
  } catch (e) {
    // Invalid regex, skip
    console.warn(`Invalid regex in custom rule: ${pattern}`, e);
  }

  return result;
}

/**
 * Conditional: Apply transformation if condition matches
 */
function applyConditional(job: ControlMJob, config: ConditionalConfig): ControlMJob {
  const result = { ...job };
  const { condition, thenAction } = config;

  // Evaluate condition
  const fieldValue = String((result as Record<string, unknown>)[condition.field] || "");
  let matches = false;

  switch (condition.operator) {
    case "equals":
      matches = fieldValue.toLowerCase() === condition.value.toLowerCase();
      break;
    case "contains":
      matches = fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      break;
    case "starts_with":
      matches = fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
      break;
    case "ends_with":
      matches = fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
      break;
    case "regex":
      try {
        matches = new RegExp(condition.value, "i").test(fieldValue);
      } catch {
        matches = false;
      }
      break;
  }

  if (!matches) return result;

  // Apply action
  const currentValue = String((result as Record<string, unknown>)[thenAction.targetField] || "");

  switch (thenAction.action) {
    case "set":
      (result as Record<string, unknown>)[thenAction.targetField] = thenAction.value;
      break;
    case "append":
      (result as Record<string, unknown>)[thenAction.targetField] = currentValue + thenAction.value;
      break;
    case "prepend":
      (result as Record<string, unknown>)[thenAction.targetField] = thenAction.value + currentValue;
      break;
    case "replace":
      // Replace the entire field with a template value
      // Support simple placeholders like {{JOBNAME}}, {{APPLICATION}}
      let newValue = thenAction.value;
      const placeholderRegex = /\{\{(\w+)\}\}/g;
      newValue = newValue.replace(placeholderRegex, (_, fieldName) => {
        return String((result as Record<string, unknown>)[fieldName] || "");
      });
      (result as Record<string, unknown>)[thenAction.targetField] = newValue;
      break;
  }

  return result;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate a custom rule configuration
 */
export function validateCustomRule(rule: CustomRule): { valid: boolean; error?: string } {
  if (!rule.name || rule.name.trim() === "") {
    return { valid: false, error: "Rule name is required" };
  }

  if (!rule.config) {
    return { valid: false, error: "Rule configuration is required" };
  }

  switch (rule.config.type) {
    case "value_replace":
      if (!rule.config.searchValue) {
        return { valid: false, error: "Search value is required" };
      }
      break;
    case "field_mapping":
      if (!rule.config.sourceField) {
        return { valid: false, error: "Source field is required" };
      }
      if (!rule.config.mappings || rule.config.mappings.length === 0) {
        return { valid: false, error: "At least one mapping is required" };
      }
      break;
    case "regex_transform":
      if (!rule.config.targetField) {
        return { valid: false, error: "Target field is required" };
      }
      if (!rule.config.pattern) {
        return { valid: false, error: "Pattern is required" };
      }
      try {
        new RegExp(rule.config.pattern);
      } catch {
        return { valid: false, error: "Invalid regex pattern" };
      }
      break;
    case "conditional":
      if (!rule.config.condition?.field || !rule.config.condition?.value) {
        return { valid: false, error: "Condition field and value are required" };
      }
      if (!rule.config.thenAction?.targetField) {
        return { valid: false, error: "Action target field is required" };
      }
      break;
    default:
      return { valid: false, error: "Unknown rule type" };
  }

  return { valid: true };
}

/**
 * Get sample rules for demonstration
 */
export function getSampleCustomRules(): CustomRule[] {
  return [
    {
      id: "sample_1",
      name: "Replace PROD with production",
      description: "Replace environment references",
      isActive: false,
      priority: 100,
      type: "value_replace",
      config: {
        type: "value_replace",
        searchValue: "PROD",
        replaceValue: "production",
        caseSensitive: false,
        targetFields: ["CMDLINE", "DESCRIPTION"],
      },
    },
    {
      id: "sample_2",
      name: "Map Job Types to Operators",
      description: "Custom job type to operator mapping",
      isActive: false,
      priority: 90,
      type: "field_mapping",
      config: {
        type: "field_mapping",
        sourceField: "JOB_TYPE",
        mappings: [
          { from: "Script", to: "Command" },
          { from: "Unix", to: "Command" },
          { from: "Windows", to: "Command" },
        ],
        defaultValue: "Command",
      },
    },
    {
      id: "sample_3",
      name: "Clean Path Prefixes",
      description: "Remove /ctm/ prefix from paths",
      isActive: false,
      priority: 80,
      type: "regex_transform",
      config: {
        type: "regex_transform",
        targetField: "CMDLINE",
        pattern: "^/ctm/",
        replacement: "/opt/scripts/",
        flags: "g",
      },
    },
    {
      id: "sample_4",
      name: "Add Email for Critical Jobs",
      description: "Add email notification for CRITICAL jobs",
      isActive: false,
      priority: 70,
      type: "conditional",
      config: {
        type: "conditional",
        condition: {
          field: "JOBNAME",
          operator: "contains",
          value: "CRITICAL",
        },
        thenAction: {
          targetField: "NOTIFY",
          action: "set",
          value: "alerts@company.com",
        },
      },
    },
  ];
}
