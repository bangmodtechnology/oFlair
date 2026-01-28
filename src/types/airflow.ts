// Apache Airflow DAG Types

export interface AirflowDAG {
  dagId: string;
  description?: string;
  schedule?: string;
  startDate?: string;
  endDate?: string;
  catchup?: boolean;
  tags?: string[];
  defaultArgs?: AirflowDefaultArgs;
  tasks: AirflowTask[];
  dependencies: AirflowDependency[];
}

export interface AirflowDefaultArgs {
  owner?: string;
  email?: string[];
  emailOnFailure?: boolean;
  emailOnRetry?: boolean;
  retries?: number;
  retryDelay?: number; // in minutes
  executionTimeout?: number; // in minutes
  dependsOnPast?: boolean;
}

export interface AirflowTask {
  taskId: string;
  operatorType: AirflowOperatorType;
  description?: string;
  params: Record<string, unknown>;
  pool?: string;
  priority?: number;
  queue?: string;
  triggerRule?: AirflowTriggerRule;
}

export interface AirflowDependency {
  upstream: string; // task_id
  downstream: string; // task_id
}

// Operator types
export const AIRFLOW_OPERATORS = {
  BASH: 'BashOperator',
  PYTHON: 'PythonOperator',
  EMPTY: 'EmptyOperator',
  BRANCH_PYTHON: 'BranchPythonOperator',
  SHORT_CIRCUIT: 'ShortCircuitOperator',

  // Sensors
  FILE_SENSOR: 'FileSensor',
  EXTERNAL_TASK_SENSOR: 'ExternalTaskSensor',
  TIME_SENSOR: 'TimeSensor',
  DATE_TIME_SENSOR: 'DateTimeSensor',

  // Database
  SQL_EXECUTE: 'SQLExecuteQueryOperator',

  // Cloud
  S3_KEY_SENSOR: 'S3KeySensor',
  GCS_OBJECT_SENSOR: 'GCSObjectExistenceSensor',

  // Kubernetes
  KUBERNETES_POD: 'KubernetesPodOperator',

  // Azure
  AZURE_BLOB_SENSOR: 'WasbBlobSensor',
  AZURE_BLOB_UPLOAD: 'WasbBlobUploadOperator',

  // SSH
  SSH: 'SSHOperator',

  // Email
  EMAIL: 'EmailOperator',

  // HTTP
  SIMPLE_HTTP: 'SimpleHttpOperator',

  // AWS
  LAMBDA_INVOKE: 'LambdaInvokeFunctionOperator',
  S3_COPY: 'S3CopyObjectOperator',
  GLUE: 'GlueJobOperator',

  // SAP
  SAP_HANA: 'SapHanaOperator',

  // Informatica
  INFORMATICA_CLOUD: 'InformaticaCloudRunTaskOperator',

  // Spark/Databricks
  SPARK_SUBMIT: 'SparkSubmitOperator',
  DATABRICKS_SUBMIT: 'DatabricksSubmitRunOperator',

  // SFTP
  SFTP: 'SFTPOperator',
  SFTP_SENSOR: 'SFTPSensor',
} as const;

export type AirflowOperatorType = typeof AIRFLOW_OPERATORS[keyof typeof AIRFLOW_OPERATORS];

// Trigger rules
export const AIRFLOW_TRIGGER_RULES = {
  ALL_SUCCESS: 'all_success',
  ALL_FAILED: 'all_failed',
  ALL_DONE: 'all_done',
  ALL_SKIPPED: 'all_skipped',
  ONE_SUCCESS: 'one_success',
  ONE_FAILED: 'one_failed',
  NONE_FAILED: 'none_failed',
  NONE_FAILED_MIN_ONE_SUCCESS: 'none_failed_min_one_success',
  NONE_SKIPPED: 'none_skipped',
  ALWAYS: 'always',
} as const;

export type AirflowTriggerRule = typeof AIRFLOW_TRIGGER_RULES[keyof typeof AIRFLOW_TRIGGER_RULES];

// Schedule presets
export const AIRFLOW_SCHEDULES = {
  NONE: 'None',
  ONCE: '@once',
  HOURLY: '@hourly',
  DAILY: '@daily',
  WEEKLY: '@weekly',
  MONTHLY: '@monthly',
  YEARLY: '@yearly',
} as const;

// Generated DAG output
export interface GeneratedDAG {
  filename: string;
  content: string;
  dag: AirflowDAG;
}
