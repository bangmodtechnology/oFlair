/**
 * Conversion Report Generator
 * Creates detailed reports of the conversion process
 */

import type { ControlMJob } from "@/types/controlm";
import type { AirflowDAG, AirflowTask, GeneratedDAG } from "@/types/airflow";

export interface ConversionWarning {
  jobName: string;
  field: string;
  message: string;
  severity: "info" | "warning" | "error";
  suggestion?: string;
}

export interface JobTypeStats {
  type: string;
  count: number;
  operator: string;
  percentage: number;
}

export interface ConversionReport {
  summary: {
    totalJobs: number;
    convertedJobs: number;
    failedJobs: number;
    totalDags: number;
    totalTasks: number;
    totalDependencies: number;
    conversionRate: number;
  };
  jobTypes: JobTypeStats[];
  operators: {
    name: string;
    count: number;
    percentage: number;
  }[];
  warnings: ConversionWarning[];
  manualReviewRequired: {
    jobName: string;
    reason: string;
    field?: string;
    originalValue?: string;
  }[];
  scheduleConversions: {
    dagId: string;
    original: string;
    converted: string;
    notes: string[];
  }[];
  dependencyStats: {
    totalConditions: number;
    internalDependencies: number;
    externalDependencies: number;
    circularDependencies: number;
  };
  timestamp: Date;
  sourceFile?: string;
  airflowVersion?: string;
}

/**
 * Generate a conversion report
 */
export function generateReport(
  jobs: ControlMJob[],
  generatedDags: GeneratedDAG[],
  options?: {
    sourceFile?: string;
    airflowVersion?: string;
  }
): ConversionReport {
  const warnings: ConversionWarning[] = [];
  const manualReviewRequired: ConversionReport["manualReviewRequired"] = [];

  // Analyze jobs for warnings
  for (const job of jobs) {
    analyzeJob(job, warnings, manualReviewRequired);
  }

  // Count job types
  const jobTypeCounts = new Map<string, number>();
  for (const job of jobs) {
    const jobType = job.JOB_TYPE || "Unknown";
    jobTypeCounts.set(jobType, (jobTypeCounts.get(jobType) || 0) + 1);
  }

  const jobTypes: JobTypeStats[] = [];
  for (const [type, count] of jobTypeCounts) {
    jobTypes.push({
      type,
      count,
      operator: getOperatorForJobType(type),
      percentage: Math.round((count / jobs.length) * 100),
    });
  }
  jobTypes.sort((a, b) => b.count - a.count);

  // Count operators
  const operatorCounts = new Map<string, number>();
  for (const dag of generatedDags) {
    for (const task of dag.dag.tasks) {
      operatorCounts.set(
        task.operatorType,
        (operatorCounts.get(task.operatorType) || 0) + 1
      );
    }
  }

  const totalTasks = Array.from(operatorCounts.values()).reduce((a, b) => a + b, 0);
  const operators = Array.from(operatorCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalTasks) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate dependency stats
  const dependencyStats = analyzeDependencies(jobs, generatedDags);

  // Schedule conversions
  const scheduleConversions: ConversionReport["scheduleConversions"] = [];
  for (const dag of generatedDags) {
    if (dag.dag.schedule) {
      scheduleConversions.push({
        dagId: dag.dag.dagId,
        original: "Control-M Schedule",
        converted: dag.dag.schedule,
        notes: [],
      });
    }
  }

  // Calculate totals
  const totalDependencies = generatedDags.reduce(
    (sum, dag) => sum + dag.dag.dependencies.length,
    0
  );

  return {
    summary: {
      totalJobs: jobs.length,
      convertedJobs: totalTasks,
      failedJobs: jobs.length - totalTasks,
      totalDags: generatedDags.length,
      totalTasks,
      totalDependencies,
      conversionRate: Math.round((totalTasks / jobs.length) * 100),
    },
    jobTypes,
    operators,
    warnings,
    manualReviewRequired,
    scheduleConversions,
    dependencyStats,
    timestamp: new Date(),
    sourceFile: options?.sourceFile,
    airflowVersion: options?.airflowVersion,
  };
}

/**
 * Analyze a job for potential issues
 */
function analyzeJob(
  job: ControlMJob,
  warnings: ConversionWarning[],
  manualReview: ConversionReport["manualReviewRequired"]
): void {
  // Check for missing command
  if (!job.CMDLINE && !job.FILENAME && job.JOB_TYPE !== "Dummy") {
    warnings.push({
      jobName: job.JOBNAME,
      field: "CMDLINE/FILENAME",
      message: "No command or script file specified",
      severity: "warning",
      suggestion: "Add a bash_command parameter manually",
    });
  }

  // Check for complex scheduling
  if (job.DAYSCAL || job.CONFCAL || job.WEEKSCAL) {
    manualReview.push({
      jobName: job.JOBNAME,
      reason: "Uses Control-M calendar - requires manual schedule configuration",
      field: "DAYSCAL/CONFCAL",
      originalValue: job.DAYSCAL || job.CONFCAL || job.WEEKSCAL,
    });
  }

  // Check for host/agent configuration
  if (job.HOST || job.AGENT) {
    warnings.push({
      jobName: job.JOBNAME,
      field: "HOST/AGENT",
      message: `Job runs on specific host: ${job.HOST || job.AGENT}`,
      severity: "info",
      suggestion: "Consider using Airflow pools or queues",
    });
  }

  // Check for resource requirements
  if (job.RESOURCE_NAME || job.RESOURCE_QUANTITY) {
    warnings.push({
      jobName: job.JOBNAME,
      field: "RESOURCE",
      message: "Job has resource requirements",
      severity: "warning",
      suggestion: "Configure Airflow pools for resource management",
    });
  }

  // Check for file triggers
  if (job.JOB_TYPE === "FileWatcher" && !job.FILENAME) {
    warnings.push({
      jobName: job.JOBNAME,
      field: "FILENAME",
      message: "FileWatcher job without file path",
      severity: "error",
      suggestion: "Specify the filepath parameter for FileSensor",
    });
  }

  // Check for cyclic conditions
  if (job.INCOND && job.OUTCOND) {
    const inCondNames = job.INCOND.map((c) => c.NAME);
    const outCondNames = job.OUTCOND.map((c) => c.NAME);
    const overlap = inCondNames.filter((n) => outCondNames.includes(n));
    if (overlap.length > 0) {
      warnings.push({
        jobName: job.JOBNAME,
        field: "INCOND/OUTCOND",
        message: `Potential self-dependency on conditions: ${overlap.join(", ")}`,
        severity: "warning",
      });
    }
  }

  // Check for special characters in job name
  if (/[^a-zA-Z0-9_]/.test(job.JOBNAME)) {
    warnings.push({
      jobName: job.JOBNAME,
      field: "JOBNAME",
      message: "Job name contains special characters",
      severity: "info",
      suggestion: `Will be converted to: ${job.JOBNAME.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`,
    });
  }
}

/**
 * Get the Airflow operator for a Control-M job type
 */
function getOperatorForJobType(jobType: string): string {
  const mapping: Record<string, string> = {
    Command: "BashOperator",
    Script: "BashOperator",
    FileWatcher: "FileSensor",
    Dummy: "EmptyOperator",
    Box: "EmptyOperator",
    FTP: "SFTPOperator",
    SFTP: "SFTPOperator",
    Database: "SQLExecuteQueryOperator",
    Email: "EmailOperator",
    HTTP: "SimpleHttpOperator",
    AWS: "AwsBaseOperator",
    Azure: "WasbBlobSensor",
    GCP: "GCSObjectExistenceSensor",
    Kubernetes: "KubernetesPodOperator",
    Remote: "SSHOperator",
    Unknown: "BashOperator",
  };

  return mapping[jobType] || "BashOperator";
}

/**
 * Analyze dependencies
 */
function analyzeDependencies(
  jobs: ControlMJob[],
  dags: GeneratedDAG[]
): ConversionReport["dependencyStats"] {
  let totalConditions = 0;
  let internalDependencies = 0;
  let externalDependencies = 0;

  // Build a set of all job names
  const allJobNames = new Set(jobs.map((j) => j.JOBNAME));

  // Count conditions
  for (const job of jobs) {
    if (job.INCOND) {
      totalConditions += job.INCOND.length;
    }
    if (job.OUTCOND) {
      totalConditions += job.OUTCOND.length;
    }
  }

  // Count dependencies
  for (const dag of dags) {
    const dagTaskIds = new Set(dag.dag.tasks.map((t) => t.taskId));
    for (const dep of dag.dag.dependencies) {
      if (dagTaskIds.has(dep.upstream) && dagTaskIds.has(dep.downstream)) {
        internalDependencies++;
      } else {
        externalDependencies++;
      }
    }
  }

  // Check for circular dependencies (simplified)
  const circularDependencies = detectCircularDependencies(dags);

  return {
    totalConditions,
    internalDependencies,
    externalDependencies,
    circularDependencies,
  };
}

/**
 * Detect circular dependencies
 */
function detectCircularDependencies(dags: GeneratedDAG[]): number {
  let circularCount = 0;

  for (const dag of dags) {
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const dep of dag.dag.dependencies) {
      const existing = graph.get(dep.upstream) || [];
      existing.push(dep.downstream);
      graph.set(dep.upstream, existing);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function hasCycle(node: string): boolean {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    }

    for (const node of graph.keys()) {
      if (!visited.has(node) && hasCycle(node)) {
        circularCount++;
      }
    }
  }

  return circularCount;
}

/**
 * Format report as text
 */
export function formatReportAsText(report: ConversionReport): string {
  const lines: string[] = [];

  lines.push("=" .repeat(60));
  lines.push("CONVERSION REPORT");
  lines.push("=" .repeat(60));
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push("-".repeat(40));
  lines.push(`Total Jobs:         ${report.summary.totalJobs}`);
  lines.push(`Converted Jobs:     ${report.summary.convertedJobs}`);
  lines.push(`Failed Jobs:        ${report.summary.failedJobs}`);
  lines.push(`Total DAGs:         ${report.summary.totalDags}`);
  lines.push(`Total Dependencies: ${report.summary.totalDependencies}`);
  lines.push(`Conversion Rate:    ${report.summary.conversionRate}%`);
  lines.push("");

  // Job Types
  lines.push("JOB TYPES");
  lines.push("-".repeat(40));
  for (const jt of report.jobTypes) {
    lines.push(`${jt.type.padEnd(20)} ${jt.count.toString().padStart(5)} (${jt.percentage}%) → ${jt.operator}`);
  }
  lines.push("");

  // Operators
  lines.push("OPERATORS USED");
  lines.push("-".repeat(40));
  for (const op of report.operators) {
    lines.push(`${op.name.padEnd(25)} ${op.count.toString().padStart(5)} (${op.percentage}%)`);
  }
  lines.push("");

  // Warnings
  if (report.warnings.length > 0) {
    lines.push("WARNINGS");
    lines.push("-".repeat(40));
    for (const w of report.warnings.slice(0, 20)) {
      lines.push(`[${w.severity.toUpperCase()}] ${w.jobName}: ${w.message}`);
      if (w.suggestion) {
        lines.push(`  → ${w.suggestion}`);
      }
    }
    if (report.warnings.length > 20) {
      lines.push(`... and ${report.warnings.length - 20} more warnings`);
    }
    lines.push("");
  }

  // Manual Review
  if (report.manualReviewRequired.length > 0) {
    lines.push("MANUAL REVIEW REQUIRED");
    lines.push("-".repeat(40));
    for (const m of report.manualReviewRequired.slice(0, 10)) {
      lines.push(`${m.jobName}: ${m.reason}`);
    }
    if (report.manualReviewRequired.length > 10) {
      lines.push(`... and ${report.manualReviewRequired.length - 10} more items`);
    }
    lines.push("");
  }

  // Dependencies
  lines.push("DEPENDENCY STATISTICS");
  lines.push("-".repeat(40));
  lines.push(`Total Conditions:      ${report.dependencyStats.totalConditions}`);
  lines.push(`Internal Dependencies: ${report.dependencyStats.internalDependencies}`);
  lines.push(`External Dependencies: ${report.dependencyStats.externalDependencies}`);
  lines.push(`Circular Dependencies: ${report.dependencyStats.circularDependencies}`);
  lines.push("");

  lines.push("=" .repeat(60));
  lines.push(`Generated: ${report.timestamp.toISOString()}`);
  if (report.sourceFile) {
    lines.push(`Source: ${report.sourceFile}`);
  }
  if (report.airflowVersion) {
    lines.push(`Airflow Version: ${report.airflowVersion}`);
  }

  return lines.join("\n");
}

/**
 * Export report as JSON
 */
export function formatReportAsJson(report: ConversionReport): string {
  return JSON.stringify(report, null, 2);
}
