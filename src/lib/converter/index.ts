/**
 * OFlair Converter Engine
 * Main entry point for Control-M to Airflow conversion
 * Inspired by Google Cloud Platform's dagify
 */

import type { ControlMJob, ControlMDefinition } from "@/types/controlm";
import type { AirflowDAG, AirflowTask, AirflowDependency, GeneratedDAG } from "@/types/airflow";
import { Rules, RULE_CHAINS } from "./rules";
import { divideJobs, type DivideOptions, type DividedGroup } from "./dag-divider";
import { convertSchedule, type ControlMSchedule, cronToHuman } from "./schedule-converter";
import { generateReport, type ConversionReport } from "./report";

// Re-export types and utilities
export { Rules, RULE_CHAINS } from "./rules";
export { divideJobs, getDividerStrategies, type DivideStrategy, type DivideOptions, type DividedGroup } from "./dag-divider";
export { convertSchedule, cronToHuman, validateCron, type ControlMSchedule, type AirflowSchedule } from "./schedule-converter";
export { generateReport, formatReportAsText, formatReportAsJson, type ConversionReport, type ConversionWarning } from "./report";

/**
 * Airflow version type
 */
export type AirflowVersion = "2.5" | "2.6" | "2.7" | "2.8" | "2.9" | "2.10" | "3.0" | "3.1";

/**
 * Conversion options
 */
export interface ConversionOptions {
  airflowVersion: AirflowVersion;
  useTaskFlowApi?: boolean;
  divideStrategy?: DivideOptions;
  defaultOwner?: string;
  defaultRetries?: number;
  defaultRetryDelay?: number;
  dagIdPrefix?: string;
  dagIdSuffix?: string;
  includeComments?: boolean;
  timezone?: string;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  dags: GeneratedDAG[];
  report: ConversionReport;
  groups: DividedGroup[];
}

/**
 * Main conversion function
 */
export async function convertControlMToAirflow(
  jobs: ControlMJob[],
  options: ConversionOptions
): Promise<ConversionResult> {
  const {
    airflowVersion,
    useTaskFlowApi = false,
    divideStrategy = { strategy: "folder" },
    defaultOwner = "airflow",
    defaultRetries = 1,
    defaultRetryDelay = 5,
    dagIdPrefix = "",
    dagIdSuffix = "",
    includeComments = true,
    timezone = "UTC",
  } = options;

  // Step 1: Divide jobs into groups
  const groups = divideJobs(jobs, divideStrategy);

  // Step 2: Convert each group to a DAG
  const dags: GeneratedDAG[] = [];

  for (const group of groups) {
    const dag = convertGroupToDag(group, {
      airflowVersion,
      useTaskFlowApi,
      defaultOwner,
      defaultRetries,
      defaultRetryDelay,
      dagIdPrefix,
      dagIdSuffix,
      includeComments,
      timezone,
    });
    dags.push(dag);
  }

  // Step 3: Generate conversion report
  const report = generateReport(jobs, dags, {
    airflowVersion,
  });

  return { dags, report, groups };
}

/**
 * Convert a group of jobs to a single DAG
 */
function convertGroupToDag(
  group: DividedGroup,
  options: Omit<ConversionOptions, "divideStrategy">
): GeneratedDAG {
  const {
    airflowVersion,
    useTaskFlowApi,
    defaultOwner,
    defaultRetries,
    defaultRetryDelay,
    dagIdPrefix,
    dagIdSuffix,
    includeComments,
    timezone,
  } = options;

  // Generate DAG ID
  let dagId = Rules.applyChain(group.groupName, RULE_CHAINS.dagId);
  if (dagIdPrefix) dagId = `${dagIdPrefix}${dagId}`;
  if (dagIdSuffix) dagId = `${dagId}${dagIdSuffix}`;

  // Convert jobs to tasks
  const tasks: AirflowTask[] = group.jobs.map((job) => convertJobToTask(job));

  // Build dependencies
  const dependencies = buildDependencies(group.jobs);

  // Extract schedule from first job (if available)
  const schedule = extractSchedule(group.jobs[0]);

  // Create DAG definition
  const dag: AirflowDAG = {
    dagId,
    description: `Migrated from Control-M: ${group.groupName}`,
    schedule: schedule.scheduleInterval || "None",
    tags: ["control-m-migration", group.groupName.toLowerCase()],
    defaultArgs: {
      owner: defaultOwner,
      retries: defaultRetries,
      retryDelay: defaultRetryDelay,
      emailOnFailure: false,
      emailOnRetry: false,
    },
    tasks,
    dependencies,
  };

  // Generate Python code
  const content = generateDagCode(dag, {
    airflowVersion: airflowVersion!,
    useTaskFlowApi: useTaskFlowApi!,
    includeComments: includeComments!,
    scheduleNotes: schedule.notes,
    timezone: timezone!,
  });

  return {
    filename: `${dagId}.py`,
    content,
    dag,
  };
}

/**
 * Convert a Control-M job to an Airflow task
 */
function convertJobToTask(job: ControlMJob): AirflowTask {
  const taskId = Rules.applyChain(job.JOBNAME, RULE_CHAINS.taskId);
  const jobType = (job.JOB_TYPE || "Command").toLowerCase();

  // Determine operator type and parameters
  let operatorType: AirflowTask["operatorType"] = "BashOperator";
  const params: Record<string, unknown> = {};

  // Convert variables to env_vars
  if (job.VARIABLE && job.VARIABLE.length > 0) {
    params.env_vars = job.VARIABLE.map((v) => ({
      name: v.NAME,
      value: v.VALUE,
    }));
  }

  // Map job type to operator
  if (jobType.includes("kubernetes") || jobType.includes("container") || jobType.includes("docker")) {
    operatorType = "KubernetesPodOperator";
    params.cmds = job.CMDLINE;
    params.image = job.FILENAME || "python:3.9";
    params.namespace = job.HOST || "default";
  } else if (jobType.includes("azure") || jobType.includes("blob")) {
    operatorType = "WasbBlobSensor";
    params.blob_name = job.FILENAME;
    params.container_name = job.HOST || "default-container";
  } else if (jobType.includes("ssh") || jobType.includes("remote")) {
    operatorType = "SSHOperator";
    params.ssh_command = Rules.applyChain(job.CMDLINE, RULE_CHAINS.bashCommand);
    params.remote_host = job.HOST;
  } else if (jobType.includes("email") || jobType.includes("mail") || jobType.includes("notification")) {
    operatorType = "EmailOperator";
    params.subject = job.DESCRIPTION || "Airflow Notification";
  } else if (jobType.includes("file") || jobType.includes("watcher")) {
    operatorType = "FileSensor";
    params.filepath = job.FILENAME || "/tmp/watched_file";
  } else if (jobType.includes("python") || (job.FILENAME && job.FILENAME.endsWith(".py"))) {
    operatorType = "PythonOperator";
    params.python_callable = `run_${taskId}`;
  } else if (jobType === "dummy" || jobType === "box") {
    operatorType = "EmptyOperator";
  } else if (jobType.includes("http") || jobType.includes("rest") || jobType.includes("api")) {
    operatorType = "SimpleHttpOperator";
    params.endpoint = job.CMDLINE;
    params.method = "GET";
  } else if (jobType.includes("sql") || jobType.includes("database") || jobType.includes("db")) {
    operatorType = "SQLExecuteQueryOperator";
    params.sql = job.CMDLINE;
    params.conn_id = "default_conn";
  } else {
    // Default to BashOperator
    operatorType = "BashOperator";
    params.bash_command = Rules.applyChain(
      job.CMDLINE || job.FILENAME || "echo 'No command'",
      RULE_CHAINS.bashCommand
    );
  }

  return {
    taskId,
    operatorType,
    description: job.DESCRIPTION,
    params,
    priority: job.PRIORITY ? parseInt(job.PRIORITY) : undefined,
  };
}

/**
 * Build task dependencies from Control-M conditions
 */
function buildDependencies(jobs: ControlMJob[]): AirflowDependency[] {
  const dependencies: AirflowDependency[] = [];
  const jobNameToTaskId = new Map<string, string>();

  // Build mapping
  for (const job of jobs) {
    jobNameToTaskId.set(job.JOBNAME, Rules.applyChain(job.JOBNAME, RULE_CHAINS.taskId));
  }

  // Build dependencies from INCOND
  for (const job of jobs) {
    const taskId = jobNameToTaskId.get(job.JOBNAME)!;

    if (job.INCOND) {
      for (const cond of job.INCOND) {
        // Find producer job
        const producerJob = jobs.find(
          (j) => j.OUTCOND?.some((oc) => oc.NAME === cond.NAME)
        );

        if (producerJob) {
          const upstreamTaskId = jobNameToTaskId.get(producerJob.JOBNAME)!;
          if (upstreamTaskId !== taskId) {
            // Avoid duplicates
            const exists = dependencies.some(
              (d) => d.upstream === upstreamTaskId && d.downstream === taskId
            );
            if (!exists) {
              dependencies.push({
                upstream: upstreamTaskId,
                downstream: taskId,
              });
            }
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Extract schedule from Control-M job
 */
function extractSchedule(job: ControlMJob) {
  const schedule: ControlMSchedule = {
    DAYS: job.DAYS,
    DAYSCAL: job.DAYSCAL,
    MONTHS: job.MONTHS,
    TIMEFROM: job.TIMEFROM,
    TIMETO: job.TIMETO,
    TIME: (job as Record<string, unknown>).TIME as string | undefined,
    INTERVAL: (job as Record<string, unknown>).INTERVAL as string | undefined,
    CONFCAL: job.CONFCAL,
    WEEKS: (job as Record<string, unknown>).WEEKS as string | undefined,
  };

  return convertSchedule(schedule);
}

/**
 * Generate DAG Python code
 */
function generateDagCode(
  dag: AirflowDAG,
  options: {
    airflowVersion: AirflowVersion;
    useTaskFlowApi: boolean;
    includeComments: boolean;
    scheduleNotes: string[];
    timezone: string;
  }
): string {
  const { airflowVersion, useTaskFlowApi, includeComments, scheduleNotes, timezone } = options;
  const isV3 = airflowVersion.startsWith("3");
  const lines: string[] = [];

  // Docstring
  lines.push('"""');
  lines.push(`Auto-generated Airflow DAG from Control-M`);
  lines.push(`Generated by OFlair - https://github.com/bangmodtech/oflair`);
  lines.push(`DAG: ${dag.dagId}`);
  lines.push(`Airflow Version: ${airflowVersion}`);
  if (dag.description) {
    lines.push(`Description: ${dag.description}`);
  }
  lines.push('"""');
  lines.push("");

  // Imports
  lines.push("from datetime import datetime, timedelta");

  if (isV3) {
    if (useTaskFlowApi) {
      lines.push("from airflow.sdk import dag, task");
    } else {
      lines.push("from airflow.sdk import DAG");
    }
    lines.push("from airflow.providers.standard.operators.bash import BashOperator");
    lines.push("from airflow.providers.standard.operators.python import PythonOperator");
    lines.push("from airflow.providers.standard.operators.empty import EmptyOperator");
    lines.push("from airflow.providers.standard.sensors.filesystem import FileSensor");
  } else {
    lines.push("from airflow import DAG");
    lines.push("from airflow.operators.bash import BashOperator");
    lines.push("from airflow.operators.python import PythonOperator");
    lines.push("from airflow.operators.empty import EmptyOperator");
    lines.push("from airflow.sensors.filesystem import FileSensor");
  }

  // Additional imports based on operators used
  const operatorTypes = new Set(dag.tasks.map((t) => t.operatorType));
  if (operatorTypes.has("KubernetesPodOperator")) {
    lines.push("from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator");
  }
  if (operatorTypes.has("WasbBlobSensor")) {
    lines.push("from airflow.providers.microsoft.azure.sensors.wasb import WasbBlobSensor");
  }
  if (operatorTypes.has("SSHOperator")) {
    lines.push("from airflow.providers.ssh.operators.ssh import SSHOperator");
  }
  if (operatorTypes.has("EmailOperator")) {
    if (isV3) {
      lines.push("from airflow.providers.standard.operators.email import EmailOperator");
    } else {
      lines.push("from airflow.operators.email import EmailOperator");
    }
  }
  if (operatorTypes.has("SimpleHttpOperator")) {
    lines.push("from airflow.providers.http.operators.http import SimpleHttpOperator");
  }
  if (operatorTypes.has("SQLExecuteQueryOperator")) {
    lines.push("from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator");
  }

  lines.push("");

  // Schedule notes as comments
  if (includeComments && scheduleNotes.length > 0) {
    lines.push("# Schedule conversion notes:");
    for (const note of scheduleNotes) {
      lines.push(`# - ${note}`);
    }
    lines.push("");
  }

  // Default args
  lines.push("default_args = {");
  lines.push(`    'owner': '${dag.defaultArgs?.owner || "airflow"}',`);
  lines.push("    'depends_on_past': False,");
  lines.push("    'email_on_failure': False,");
  lines.push("    'email_on_retry': False,");
  lines.push(`    'retries': ${dag.defaultArgs?.retries ?? 1},`);
  lines.push(`    'retry_delay': timedelta(minutes=${dag.defaultArgs?.retryDelay ?? 5}),`);
  lines.push("}");
  lines.push("");

  // DAG definition
  if (useTaskFlowApi && isV3) {
    lines.push("@dag(");
    lines.push(`    dag_id='${dag.dagId}',`);
    lines.push("    default_args=default_args,");
    lines.push(`    description='${Rules.escapeQuotes(dag.description || "")}',`);
    lines.push(`    schedule=${dag.schedule === "None" ? "None" : `'${dag.schedule}'`},`);
    lines.push("    start_date=datetime(2024, 1, 1),");
    lines.push("    catchup=False,");
    lines.push(`    tags=${JSON.stringify(dag.tags || [])},`);
    lines.push(")");
    lines.push(`def ${dag.dagId.replace(/-/g, "_")}_workflow():`);
    lines.push(`    """${dag.description || "Converted DAG"}"""`);
    lines.push("");
  } else {
    lines.push("with DAG(");
    lines.push(`    dag_id='${dag.dagId}',`);
    lines.push("    default_args=default_args,");
    lines.push(`    description='${Rules.escapeQuotes(dag.description || "")}',`);
    lines.push(`    schedule=${dag.schedule === "None" ? "None" : `'${dag.schedule}'`},`);
    lines.push("    start_date=datetime(2024, 1, 1),");
    lines.push("    catchup=False,");
    lines.push(`    tags=${JSON.stringify(dag.tags || [])},`);
    lines.push(") as dag:");
    lines.push("");
  }

  const indent = useTaskFlowApi && isV3 ? "    " : "    ";

  // Tasks
  for (const task of dag.tasks) {
    if (includeComments && task.description) {
      lines.push(`${indent}# ${task.description}`);
    }

    lines.push(`${indent}${task.taskId} = ${task.operatorType}(`);
    lines.push(`${indent}    task_id='${task.taskId}',`);

    // Add operator-specific params
    switch (task.operatorType) {
      case "BashOperator":
        lines.push(`${indent}    bash_command='''${task.params.bash_command || "echo 'No command'"}''',`);
        break;
      case "PythonOperator":
        lines.push(`${indent}    python_callable=${task.params.python_callable || "lambda: None"},`);
        break;
      case "FileSensor":
        lines.push(`${indent}    filepath='${task.params.filepath || "/tmp/file"}',`);
        lines.push(`${indent}    poke_interval=60,`);
        lines.push(`${indent}    timeout=3600,`);
        break;
      case "KubernetesPodOperator":
        lines.push(`${indent}    name='${task.taskId}-pod',`);
        lines.push(`${indent}    namespace='${task.params.namespace || "default"}',`);
        lines.push(`${indent}    image='${task.params.image || "python:3.9"}',`);
        if (task.params.cmds) {
          lines.push(`${indent}    cmds=['/bin/bash', '-c'],`);
          lines.push(`${indent}    arguments=['''${task.params.cmds}'''],`);
        }
        lines.push(`${indent}    get_logs=True,`);
        lines.push(`${indent}    is_delete_operator_pod=True,`);
        break;
      case "SSHOperator":
        lines.push(`${indent}    ssh_conn_id='ssh_default',`);
        lines.push(`${indent}    command='''${task.params.ssh_command || "echo hello"}''',`);
        if (task.params.remote_host) {
          lines.push(`${indent}    remote_host='${task.params.remote_host}',`);
        }
        break;
      case "WasbBlobSensor":
        lines.push(`${indent}    container_name='${task.params.container_name || "default"}',`);
        lines.push(`${indent}    blob_name='${task.params.blob_name || "file.txt"}',`);
        lines.push(`${indent}    wasb_conn_id='azure_blob_default',`);
        break;
      case "EmailOperator":
        lines.push(`${indent}    to=['admin@example.com'],`);
        lines.push(`${indent}    subject='${task.params.subject || "Notification"}',`);
        lines.push(`${indent}    html_content='<p>Task completed</p>',`);
        break;
      case "SimpleHttpOperator":
        lines.push(`${indent}    endpoint='${task.params.endpoint || "/"}',`);
        lines.push(`${indent}    method='${task.params.method || "GET"}',`);
        lines.push(`${indent}    http_conn_id='http_default',`);
        break;
      case "SQLExecuteQueryOperator":
        lines.push(`${indent}    sql='''${task.params.sql || "SELECT 1"}''',`);
        lines.push(`${indent}    conn_id='${task.params.conn_id || "default_conn"}',`);
        break;
    }

    // Add env_vars if present
    if (task.params.env_vars && Array.isArray(task.params.env_vars)) {
      lines.push(`${indent}    env={`);
      for (const ev of task.params.env_vars as Array<{ name: string; value: string }>) {
        lines.push(`${indent}        '${ev.name}': '${ev.value}',`);
      }
      lines.push(`${indent}    },`);
    }

    lines.push(`${indent})`);
    lines.push("");
  }

  // Dependencies
  if (dag.dependencies.length > 0) {
    if (includeComments) {
      lines.push(`${indent}# Task dependencies`);
    }
    for (const dep of dag.dependencies) {
      lines.push(`${indent}${dep.upstream} >> ${dep.downstream}`);
    }
  } else {
    if (includeComments) {
      lines.push(`${indent}# No dependencies defined`);
    }
  }

  // TaskFlow API: instantiate the DAG
  if (useTaskFlowApi && isV3) {
    lines.push("");
    lines.push(`${dag.dagId.replace(/-/g, "_")}_dag = ${dag.dagId.replace(/-/g, "_")}_workflow()`);
  }

  lines.push("");

  return lines.join("\n");
}
