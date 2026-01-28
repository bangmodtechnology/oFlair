/**
 * DAG Validation Module
 * Validates generated Airflow DAG code for common issues
 */

import type { AirflowDAG, GeneratedDAG } from "@/types/airflow";

export interface ValidationError {
  type: "error" | "warning";
  code: string;
  message: string;
  line?: number;
  taskId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Python reserved keywords that cannot be used as identifiers
 */
const PYTHON_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await",
  "break", "class", "continue", "def", "del", "elif", "else", "except",
  "finally", "for", "from", "global", "if", "import", "in", "is",
  "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try",
  "while", "with", "yield",
]);

/**
 * Airflow reserved/problematic identifiers
 */
const AIRFLOW_RESERVED = new Set([
  "dag", "task", "default_args", "datetime", "timedelta",
]);

/**
 * Check if a string is a valid Python identifier
 */
function isValidPythonIdentifier(name: string): boolean {
  // Must start with letter or underscore, followed by letters, digits, or underscores
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return identifierRegex.test(name);
}

/**
 * Validate a single DAG
 */
export function validateDAG(dag: AirflowDAG): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Validate DAG ID
  if (!dag.dagId) {
    errors.push({
      type: "error",
      code: "MISSING_DAG_ID",
      message: "DAG ID is required",
    });
  } else {
    if (!isValidPythonIdentifier(dag.dagId.replace(/-/g, "_"))) {
      errors.push({
        type: "error",
        code: "INVALID_DAG_ID",
        message: `DAG ID '${dag.dagId}' is not a valid Python identifier`,
      });
    }
    if (PYTHON_KEYWORDS.has(dag.dagId)) {
      errors.push({
        type: "error",
        code: "RESERVED_DAG_ID",
        message: `DAG ID '${dag.dagId}' is a Python reserved keyword`,
      });
    }
  }

  // 2. Validate tasks
  const taskIds = new Set<string>();

  if (dag.tasks.length === 0) {
    warnings.push({
      type: "warning",
      code: "NO_TASKS",
      message: "DAG has no tasks defined",
    });
  }

  for (const task of dag.tasks) {
    // Check task ID
    if (!task.taskId) {
      errors.push({
        type: "error",
        code: "MISSING_TASK_ID",
        message: "Task ID is required",
      });
      continue;
    }

    // Check for valid identifier
    if (!isValidPythonIdentifier(task.taskId)) {
      errors.push({
        type: "error",
        code: "INVALID_TASK_ID",
        message: `Task ID '${task.taskId}' is not a valid Python identifier`,
        taskId: task.taskId,
      });
    }

    // Check for reserved keywords
    if (PYTHON_KEYWORDS.has(task.taskId)) {
      errors.push({
        type: "error",
        code: "RESERVED_TASK_ID",
        message: `Task ID '${task.taskId}' is a Python reserved keyword`,
        taskId: task.taskId,
      });
    }

    // Check for Airflow conflicts
    if (AIRFLOW_RESERVED.has(task.taskId)) {
      warnings.push({
        type: "warning",
        code: "AIRFLOW_RESERVED_TASK_ID",
        message: `Task ID '${task.taskId}' may conflict with Airflow variables`,
        taskId: task.taskId,
      });
    }

    // Check for duplicates
    if (taskIds.has(task.taskId)) {
      errors.push({
        type: "error",
        code: "DUPLICATE_TASK_ID",
        message: `Duplicate task ID '${task.taskId}'`,
        taskId: task.taskId,
      });
    }
    taskIds.add(task.taskId);

    // Validate operator-specific params
    validateTaskParams(task, errors, warnings);
  }

  // 3. Validate dependencies
  for (const dep of dag.dependencies) {
    if (!taskIds.has(dep.upstream)) {
      errors.push({
        type: "error",
        code: "MISSING_UPSTREAM_TASK",
        message: `Dependency references non-existent upstream task '${dep.upstream}'`,
      });
    }
    if (!taskIds.has(dep.downstream)) {
      errors.push({
        type: "error",
        code: "MISSING_DOWNSTREAM_TASK",
        message: `Dependency references non-existent downstream task '${dep.downstream}'`,
      });
    }
    if (dep.upstream === dep.downstream) {
      errors.push({
        type: "error",
        code: "SELF_DEPENDENCY",
        message: `Task '${dep.upstream}' cannot depend on itself`,
      });
    }
  }

  // 4. Check for circular dependencies
  const cycles = detectCycles(dag.tasks, dag.dependencies);
  for (const cycle of cycles) {
    errors.push({
      type: "error",
      code: "CIRCULAR_DEPENDENCY",
      message: `Circular dependency detected: ${cycle.join(" -> ")}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate task-specific parameters
 */
function validateTaskParams(
  task: AirflowDAG["tasks"][0],
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  switch (task.operatorType) {
    case "BashOperator":
      if (!task.params.bash_command) {
        warnings.push({
          type: "warning",
          code: "MISSING_BASH_COMMAND",
          message: `BashOperator '${task.taskId}' has no bash_command`,
          taskId: task.taskId,
        });
      }
      break;

    case "PythonOperator":
      if (!task.params.python_callable) {
        warnings.push({
          type: "warning",
          code: "MISSING_PYTHON_CALLABLE",
          message: `PythonOperator '${task.taskId}' has no python_callable`,
          taskId: task.taskId,
        });
      }
      break;

    case "FileSensor":
      if (!task.params.filepath) {
        warnings.push({
          type: "warning",
          code: "MISSING_FILEPATH",
          message: `FileSensor '${task.taskId}' has no filepath`,
          taskId: task.taskId,
        });
      }
      break;

    case "KubernetesPodOperator":
      if (!task.params.image) {
        warnings.push({
          type: "warning",
          code: "MISSING_K8S_IMAGE",
          message: `KubernetesPodOperator '${task.taskId}' has no image specified`,
          taskId: task.taskId,
        });
      }
      break;

    case "SSHOperator":
      if (!task.params.ssh_command) {
        warnings.push({
          type: "warning",
          code: "MISSING_SSH_COMMAND",
          message: `SSHOperator '${task.taskId}' has no ssh_command`,
          taskId: task.taskId,
        });
      }
      break;

    case "SQLExecuteQueryOperator":
      if (!task.params.sql) {
        warnings.push({
          type: "warning",
          code: "MISSING_SQL",
          message: `SQLExecuteQueryOperator '${task.taskId}' has no SQL query`,
          taskId: task.taskId,
        });
      }
      break;
  }
}

/**
 * Detect circular dependencies using DFS
 */
function detectCycles(
  tasks: AirflowDAG["tasks"],
  dependencies: AirflowDAG["dependencies"]
): string[][] {
  const cycles: string[][] = [];
  const taskIds = new Set(tasks.map((t) => t.taskId));

  // Build adjacency list
  const graph = new Map<string, string[]>();
  for (const id of taskIds) {
    graph.set(id, []);
  }
  for (const dep of dependencies) {
    if (graph.has(dep.upstream)) {
      graph.get(dep.upstream)!.push(dep.downstream);
    }
  }

  // DFS for cycle detection
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
        return true;
      }
    }

    path.pop();
    recursionStack.delete(node);
    return false;
  }

  for (const id of taskIds) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }

  return cycles;
}

/**
 * Validate Python code syntax (basic checks)
 */
export function validatePythonSyntax(code: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = code.split("\n");

  // Track indentation
  let expectedIndent = 0;
  let inMultilineString = false;
  let multilineStringChar = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Track multiline strings
    const tripleQuotes = ['"""', "'''"];
    for (const quote of tripleQuotes) {
      const count = (line.match(new RegExp(quote.replace(/'/g, "\\'"), "g")) || []).length;
      if (count % 2 === 1) {
        if (inMultilineString && multilineStringChar === quote) {
          inMultilineString = false;
          multilineStringChar = "";
        } else if (!inMultilineString) {
          inMultilineString = true;
          multilineStringChar = quote;
        }
      }
    }

    if (inMultilineString) continue;

    // Check for unmatched brackets
    const openBrackets = (line.match(/[\(\[\{]/g) || []).length;
    const closeBrackets = (line.match(/[\)\]\}]/g) || []).length;

    // Check for common syntax errors
    if (trimmed.endsWith("::")) {
      errors.push({
        type: "error",
        code: "DOUBLE_COLON",
        message: "Double colon syntax error",
        line: lineNum,
      });
    }

    // Check for tabs (Python prefers spaces)
    if (line.includes("\t")) {
      errors.push({
        type: "warning",
        code: "TAB_CHARACTER",
        message: "Tab character found (use spaces for indentation)",
        line: lineNum,
      });
    }
  }

  // Check for unclosed multiline string
  if (inMultilineString) {
    errors.push({
      type: "error",
      code: "UNCLOSED_STRING",
      message: "Unclosed multiline string",
    });
  }

  return errors;
}

/**
 * Validate a generated DAG (both structure and code)
 */
export function validateGeneratedDAG(generatedDag: GeneratedDAG): ValidationResult {
  // Validate DAG structure
  const structureResult = validateDAG(generatedDag.dag);

  // Validate Python syntax
  const syntaxErrors = validatePythonSyntax(generatedDag.content);

  // Combine results
  const allErrors = [
    ...structureResult.errors,
    ...syntaxErrors.filter((e) => e.type === "error"),
  ];
  const allWarnings = [
    ...structureResult.warnings,
    ...syntaxErrors.filter((e) => e.type === "warning"),
  ];

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validate multiple DAGs
 */
export function validateAllDAGs(dags: GeneratedDAG[]): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const dag of dags) {
    results.set(dag.filename, validateGeneratedDAG(dag));
  }

  return results;
}
