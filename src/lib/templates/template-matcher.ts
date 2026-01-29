/**
 * Template Matching Engine
 * Matches Control-M jobs to the most appropriate conversion template
 */

import type { ControlMJob } from "@/types/controlm";
import type { ConversionTemplate, TemplateCondition, TemplateMatchResult, MappingRule } from "@/types/template";
import { loadAllTemplates, getBuiltinTemplates } from "./template-loader";

/**
 * Evaluate a single condition against a job
 */
function evaluateCondition(job: ControlMJob, condition: TemplateCondition): boolean {
  // Get the field value from the job
  const fieldValue = getFieldValue(job, condition.field);
  const conditionValue = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
  const compareValue = condition.caseSensitive ? String(fieldValue || "") : String(fieldValue || "").toLowerCase();

  switch (condition.operator) {
    case "equals":
      return compareValue === conditionValue;
    case "not_equals":
      return compareValue !== conditionValue;
    case "contains":
      return compareValue.includes(conditionValue);
    case "not_contains":
      return !compareValue.includes(conditionValue);
    case "starts_with":
      return compareValue.startsWith(conditionValue);
    case "ends_with":
      return compareValue.endsWith(conditionValue);
    case "regex":
      try {
        const regex = new RegExp(condition.value, condition.caseSensitive ? "" : "i");
        return regex.test(String(fieldValue || ""));
      } catch {
        return false;
      }
    case "is_empty":
      return !fieldValue || String(fieldValue).trim() === "";
    case "is_not_empty":
      return !!fieldValue && String(fieldValue).trim() !== "";
    default:
      return false;
  }
}

/**
 * Get a field value from a job object
 */
function getFieldValue(job: ControlMJob, field: string): string | undefined {
  // Direct field access
  if (field in job) {
    return String((job as Record<string, unknown>)[field] || "");
  }

  // Nested field access (e.g., "VARIABLE.0.NAME")
  const parts = field.split(".");
  let value: unknown = job;
  for (const part of parts) {
    if (value && typeof value === "object") {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value !== undefined ? String(value) : undefined;
}

/**
 * Find all matching templates for a job
 */
export function findMatchingTemplates(job: ControlMJob, templates?: ConversionTemplate[]): TemplateMatchResult[] {
  const allTemplates = templates || loadAllTemplates();
  const activeTemplates = allTemplates.filter((t) => t.isActive);
  const results: TemplateMatchResult[] = [];

  for (const template of activeTemplates) {
    // Check if any condition matches (OR logic between conditions)
    const matchedConditions: string[] = [];
    let hasMatch = false;

    for (const condition of template.conditions) {
      if (evaluateCondition(job, condition)) {
        matchedConditions.push(condition.id);
        hasMatch = true;
      }
    }

    // If at least one condition matches, include this template
    if (hasMatch) {
      results.push({
        template,
        score: template.priority * (matchedConditions.length / template.conditions.length),
        matchedConditions,
      });
    }
  }

  // Sort by score (highest first), then by priority
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.template.priority - a.template.priority;
  });
}

/**
 * Find the best matching template for a job
 */
export function findBestTemplate(job: ControlMJob, templates?: ConversionTemplate[]): ConversionTemplate | null {
  const matches = findMatchingTemplates(job, templates);
  return matches.length > 0 ? matches[0].template : null;
}

/**
 * Apply template mappings to extract values from a job
 */
export function applyMappings(job: ControlMJob, template: ConversionTemplate): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of template.mappings) {
    let value = getFieldValue(job, mapping.source);

    // Apply transform
    if (value && mapping.transform) {
      value = applyTransform(value, mapping.transform);
    }

    // Use default value if empty
    if (!value && mapping.defaultValue) {
      value = mapping.defaultValue;
    }

    // Set the value if present
    if (value !== undefined) {
      setNestedValue(result, mapping.target, value);
    }
  }

  // Always include task_id based on job name
  if (!result.task_id) {
    result.task_id = applyTransform(job.JOBNAME, "lowercase")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^(\d)/, "_$1");
  }

  // Include variables if present
  if (job.VARIABLE && job.VARIABLE.length > 0) {
    result.variables = job.VARIABLE.map((v) => ({
      name: v.NAME,
      value: v.VALUE,
    }));
  }

  return result;
}

/**
 * Apply a transform to a value
 */
function applyTransform(value: string, transform: string): string {
  switch (transform) {
    case "lowercase":
      return value.toLowerCase();
    case "uppercase":
      return value.toUpperCase();
    case "trim":
      return value.trim();
    case "camel_case":
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
    case "replace_spaces":
      return value.replace(/\s+/g, "_");
    default:
      return value;
  }
}

/**
 * Set a nested value in an object
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Get the operator type from a template
 */
export function getOperatorFromTemplate(template: ConversionTemplate): string {
  // Extract operator from template output or ID
  const operatorMap: Record<string, string> = {
    "bash-operator": "BashOperator",
    "python-operator": "PythonOperator",
    "file-sensor": "FileSensor",
    "empty-operator": "EmptyOperator",
    "kubernetes-pod-operator": "KubernetesPodOperator",
    "azure-blob-operator": "WasbBlobSensor",
    "ssh-operator": "SSHOperator",
    "email-operator": "EmailOperator",
    "http-operator": "SimpleHttpOperator",
    "sql-operator": "SQLExecuteQueryOperator",
    "aws-lambda-operator": "LambdaInvokeFunctionOperator",
    "aws-s3-operator": "S3CopyObjectOperator",
    "aws-glue-operator": "GlueJobOperator",
    "sap-hana-operator": "SapHanaOperator",
    "informatica-operator": "InformaticaCloudRunTaskOperator",
    "spark-operator": "SparkSubmitOperator",
    "databricks-operator": "DatabricksSubmitRunOperator",
    "sftp-operator": "SFTPOperator",
  };

  // Check direct mapping first
  if (template.id in operatorMap) {
    return operatorMap[template.id];
  }

  // Try to extract from the template name
  const match = template.outputTemplate.match(/=\s*(\w+Operator|\w+Sensor)\(/);
  if (match) {
    return match[1];
  }

  // Default
  return "BashOperator";
}

/**
 * Get the default template for unmatched jobs
 */
export function getDefaultTemplate(): ConversionTemplate {
  const builtins = getBuiltinTemplates();
  return builtins.find((t) => t.isDefault && t.id === "bash-operator") || builtins[0];
}

/**
 * Convert a job using template matching
 */
export interface TemplateConversionResult {
  taskId: string;
  operatorType: string;
  params: Record<string, unknown>;
  template: ConversionTemplate;
  matchScore: number;
}

export function convertJobWithTemplate(job: ControlMJob, templates?: ConversionTemplate[]): TemplateConversionResult {
  const matches = findMatchingTemplates(job, templates);
  const template = matches.length > 0 ? matches[0].template : getDefaultTemplate();
  const matchScore = matches.length > 0 ? matches[0].score : 0;

  const params = applyMappings(job, template);
  const taskId = String(params.task_id || job.JOBNAME.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const operatorType = getOperatorFromTemplate(template);

  return {
    taskId,
    operatorType,
    params,
    template,
    matchScore,
  };
}

/**
 * Check if a template can handle a job
 */
export function canTemplateHandleJob(job: ControlMJob, template: ConversionTemplate): boolean {
  return template.conditions.some((condition) => evaluateCondition(job, condition));
}

/**
 * Get template statistics for a set of jobs
 */
export interface TemplateUsageStats {
  templateId: string;
  templateName: string;
  jobCount: number;
  avgMatchScore: number;
}

export function getTemplateUsageStats(jobs: ControlMJob[], templates?: ConversionTemplate[]): TemplateUsageStats[] {
  const stats = new Map<string, { count: number; totalScore: number; name: string }>();

  for (const job of jobs) {
    const result = convertJobWithTemplate(job, templates);
    const existing = stats.get(result.template.id);
    if (existing) {
      existing.count++;
      existing.totalScore += result.matchScore;
    } else {
      stats.set(result.template.id, {
        count: 1,
        totalScore: result.matchScore,
        name: result.template.name,
      });
    }
  }

  return Array.from(stats.entries()).map(([id, data]) => ({
    templateId: id,
    templateName: data.name,
    jobCount: data.count,
    avgMatchScore: data.totalScore / data.count,
  }));
}
