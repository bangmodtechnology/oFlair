// Template Loader - Load templates from YAML files or localStorage
import type { ConversionTemplate, TemplateCondition, MappingRule } from "@/types/template";

// Built-in templates (loaded from YAML at build time or hardcoded for client-side)
const BUILTIN_TEMPLATES: ConversionTemplate[] = [
  {
    id: "bash-operator",
    name: "Command to BashOperator",
    description: "Converts Control-M Command/OS jobs to Airflow BashOperator",
    isDefault: true,
    isActive: true,
    priority: 100,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Command" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "bash_command", required: true },
      { id: "m3", source: "RUN_AS", target: "env.USER" },
    ],
    outputTemplate: `{{task_id}} = BashOperator(
    task_id='{{task_id}}',
    bash_command='''{{bash_command}}''',
{{#if env}}
    env={{env}},
{{/if}}
{{#if pool}}
    pool='{{pool}}',
{{/if}}
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "python-operator",
    name: "Script to PythonOperator",
    description: "Converts Control-M Script jobs with Python files to Airflow PythonOperator",
    isDefault: true,
    isActive: true,
    priority: 90,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Script" },
      { id: "c2", field: "FILENAME", operator: "ends_with", value: ".py" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "python_callable" },
    ],
    outputTemplate: `{{task_id}} = PythonOperator(
    task_id='{{task_id}}',
    python_callable=run_{{task_id}},
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "file-sensor",
    name: "FileWatcher to FileSensor",
    description: "Converts Control-M FileWatcher jobs to Airflow FileSensor",
    isDefault: true,
    isActive: true,
    priority: 95,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "FileWatcher" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "filepath", required: true },
    ],
    outputTemplate: `{{task_id}} = FileSensor(
    task_id='{{task_id}}',
    filepath='{{filepath}}',
    poke_interval=60,
    timeout=3600,
    mode='poke',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "empty-operator",
    name: "Dummy to EmptyOperator",
    description: "Converts Control-M Dummy/Box jobs to Airflow EmptyOperator",
    isDefault: true,
    isActive: true,
    priority: 50,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Dummy" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
    ],
    outputTemplate: `{{task_id}} = EmptyOperator(
    task_id='{{task_id}}',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "kubernetes-pod-operator",
    name: "Container to KubernetesPodOperator",
    description: "Converts Control-M jobs to Airflow KubernetesPodOperator for Kubernetes deployments",
    isDefault: false,
    isActive: true,
    priority: 85,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Kubernetes" },
      { id: "c2", field: "JOB_TYPE", operator: "equals", value: "Container" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "cmds" },
      { id: "m3", source: "FILENAME", target: "image", defaultValue: "python:3.9" },
      { id: "m4", source: "HOST", target: "namespace", defaultValue: "default" },
    ],
    outputTemplate: `{{task_id}} = KubernetesPodOperator(
    task_id='{{task_id}}',
    name='{{task_id}}-pod',
    namespace='{{namespace}}',
    image='{{image}}',
{{#if cmds}}
    cmds=['/bin/bash', '-c'],
    arguments=['''{{cmds}}'''],
{{/if}}
    get_logs=True,
    is_delete_operator_pod=True,
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "azure-blob-operator",
    name: "Azure to AzureBlobStorageOperator",
    description: "Converts Control-M Azure jobs to Airflow Azure Blob Storage operators",
    isDefault: false,
    isActive: true,
    priority: 80,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Azure" },
      { id: "c2", field: "APPLICATION", operator: "contains", value: "Azure" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "blob_name" },
      { id: "m3", source: "HOST", target: "container_name", defaultValue: "default-container" },
    ],
    outputTemplate: `{{task_id}} = WasbBlobSensor(
    task_id='{{task_id}}',
    container_name='{{container_name}}',
    blob_name='{{blob_name}}',
    wasb_conn_id='azure_blob_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "ssh-operator",
    name: "Remote Command to SSHOperator",
    description: "Converts Control-M remote execution jobs to Airflow SSHOperator",
    isDefault: false,
    isActive: true,
    priority: 75,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Remote" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "command", required: true },
      { id: "m3", source: "HOST", target: "remote_host" },
      { id: "m4", source: "RUN_AS", target: "username" },
    ],
    outputTemplate: `{{task_id}} = SSHOperator(
    task_id='{{task_id}}',
    ssh_conn_id='ssh_default',
    command='''{{command}}''',
{{#if remote_host}}
    remote_host='{{remote_host}}',
{{/if}}
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "email-operator",
    name: "Notification to EmailOperator",
    description: "Converts Control-M notification jobs to Airflow EmailOperator",
    isDefault: false,
    isActive: true,
    priority: 70,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "equals", value: "Notification" },
      { id: "c2", field: "JOB_TYPE", operator: "contains", value: "Email" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "DESCRIPTION", target: "subject", defaultValue: "Airflow Notification" },
    ],
    outputTemplate: `{{task_id}} = EmailOperator(
    task_id='{{task_id}}',
    to=['admin@example.com'],
    subject='{{subject}}',
    html_content='<p>Job completed</p>',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // HTTP/REST Operator
  {
    id: "http-operator",
    name: "HTTP/REST to SimpleHttpOperator",
    description: "Converts Control-M HTTP/REST API jobs to Airflow SimpleHttpOperator",
    isDefault: false,
    isActive: true,
    priority: 72,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "http" },
      { id: "c2", field: "JOB_TYPE", operator: "contains", value: "rest" },
      { id: "c3", field: "JOB_TYPE", operator: "contains", value: "api" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "endpoint", required: true },
    ],
    outputTemplate: `{{task_id}} = SimpleHttpOperator(
    task_id='{{task_id}}',
    http_conn_id='http_default',
    endpoint='{{endpoint}}',
    method='GET',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // SQL Operator
  {
    id: "sql-operator",
    name: "Database to SQLExecuteQueryOperator",
    description: "Converts Control-M database jobs to Airflow SQLExecuteQueryOperator",
    isDefault: false,
    isActive: true,
    priority: 73,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "sql" },
      { id: "c2", field: "JOB_TYPE", operator: "contains", value: "database" },
      { id: "c3", field: "JOB_TYPE", operator: "equals", value: "Database" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "sql", required: true },
    ],
    outputTemplate: `{{task_id}} = SQLExecuteQueryOperator(
    task_id='{{task_id}}',
    conn_id='default_conn',
    sql='''{{sql}}''',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // AWS Lambda
  {
    id: "aws-lambda-operator",
    name: "Lambda to LambdaInvokeFunctionOperator",
    description: "Converts Control-M AWS Lambda jobs to Airflow LambdaInvokeFunctionOperator",
    isDefault: false,
    isActive: true,
    priority: 78,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "lambda" },
      { id: "c2", field: "JOB_TYPE", operator: "contains", value: "aws_lambda" },
      { id: "c3", field: "APPLICATION", operator: "contains", value: "Lambda" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "function_name" },
      { id: "m3", source: "FILENAME", target: "function_name" },
    ],
    outputTemplate: `{{task_id}} = LambdaInvokeFunctionOperator(
    task_id='{{task_id}}',
    function_name='{{function_name}}',
    aws_conn_id='aws_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // AWS S3
  {
    id: "aws-s3-operator",
    name: "S3 to S3CopyObjectOperator",
    description: "Converts Control-M AWS S3 jobs to Airflow S3CopyObjectOperator",
    isDefault: false,
    isActive: true,
    priority: 77,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "s3" },
      { id: "c2", field: "APPLICATION", operator: "contains", value: "S3" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "source_bucket_key", required: true },
      { id: "m3", source: "HOST", target: "dest_bucket_key", defaultValue: "destination/" },
    ],
    outputTemplate: `{{task_id}} = S3CopyObjectOperator(
    task_id='{{task_id}}',
    source_bucket_key='{{source_bucket_key}}',
    dest_bucket_key='{{dest_bucket_key}}',
    aws_conn_id='aws_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // AWS Glue
  {
    id: "aws-glue-operator",
    name: "Glue to GlueJobOperator",
    description: "Converts Control-M AWS Glue jobs to Airflow GlueJobOperator",
    isDefault: false,
    isActive: true,
    priority: 76,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "glue" },
      { id: "c2", field: "APPLICATION", operator: "contains", value: "Glue" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "job_name" },
      { id: "m3", source: "FILENAME", target: "job_name" },
    ],
    outputTemplate: `{{task_id}} = GlueJobOperator(
    task_id='{{task_id}}',
    job_name='{{job_name}}',
    aws_conn_id='aws_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // SAP HANA
  {
    id: "sap-hana-operator",
    name: "SAP to SapHanaOperator",
    description: "Converts Control-M SAP HANA jobs to Airflow SapHanaOperator",
    isDefault: false,
    isActive: true,
    priority: 74,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "sap" },
      { id: "c2", field: "JOB_TYPE", operator: "contains", value: "hana" },
      { id: "c3", field: "APPLICATION", operator: "contains", value: "SAP" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "sql", required: true },
    ],
    outputTemplate: `{{task_id}} = SapHanaOperator(
    task_id='{{task_id}}',
    sap_hana_conn_id='sap_hana_default',
    sql='''{{sql}}''',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Informatica
  {
    id: "informatica-operator",
    name: "Informatica to InformaticaCloudRunTaskOperator",
    description: "Converts Control-M Informatica jobs to Airflow InformaticaCloudRunTaskOperator",
    isDefault: false,
    isActive: true,
    priority: 74,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "informatica" },
      { id: "c2", field: "APPLICATION", operator: "contains", value: "Informatica" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "CMDLINE", target: "task_name" },
      { id: "m3", source: "FILENAME", target: "task_name" },
    ],
    outputTemplate: `{{task_id}} = InformaticaCloudRunTaskOperator(
    task_id='{{task_id}}',
    task_name='{{task_name}}',
    informatica_conn_id='informatica_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Spark Submit
  {
    id: "spark-operator",
    name: "Spark to SparkSubmitOperator",
    description: "Converts Control-M Spark jobs to Airflow SparkSubmitOperator",
    isDefault: false,
    isActive: true,
    priority: 79,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "spark" },
      { id: "c2", field: "APPLICATION", operator: "contains", value: "Spark" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "application", required: true },
    ],
    outputTemplate: `{{task_id}} = SparkSubmitOperator(
    task_id='{{task_id}}',
    application='{{application}}',
    conn_id='spark_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Databricks
  {
    id: "databricks-operator",
    name: "Databricks to DatabricksSubmitRunOperator",
    description: "Converts Control-M Databricks jobs to Airflow DatabricksSubmitRunOperator",
    isDefault: false,
    isActive: true,
    priority: 79,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "databricks" },
      { id: "c2", field: "APPLICATION", operator: "contains", value: "Databricks" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "notebook_path", defaultValue: "/Workspace/notebook" },
    ],
    outputTemplate: `{{task_id}} = DatabricksSubmitRunOperator(
    task_id='{{task_id}}',
    notebook_task={'notebook_path': '{{notebook_path}}'},
    databricks_conn_id='databricks_default',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // SFTP
  {
    id: "sftp-operator",
    name: "SFTP to SFTPOperator",
    description: "Converts Control-M SFTP/FTP jobs to Airflow SFTPOperator",
    isDefault: false,
    isActive: true,
    priority: 71,
    conditions: [
      { id: "c1", field: "JOB_TYPE", operator: "contains", value: "sftp" },
      { id: "c2", field: "JOB_TYPE", operator: "contains", value: "ftp" },
    ],
    mappings: [
      { id: "m1", source: "JOBNAME", target: "task_id", transform: "lowercase" },
      { id: "m2", source: "FILENAME", target: "local_filepath", required: true },
      { id: "m3", source: "HOST", target: "remote_filepath", defaultValue: "/remote/path" },
    ],
    outputTemplate: `{{task_id}} = SFTPOperator(
    task_id='{{task_id}}',
    ssh_conn_id='sftp_default',
    local_filepath='{{local_filepath}}',
    remote_filepath='{{remote_filepath}}',
    operation='put',
    dag=dag
)`,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const CUSTOM_TEMPLATES_KEY = "oflair_custom_templates";

// Load all templates (builtin + custom)
export function loadAllTemplates(): ConversionTemplate[] {
  const customTemplates = loadCustomTemplates();
  return [...BUILTIN_TEMPLATES, ...customTemplates];
}

// Load only custom templates from localStorage
export function loadCustomTemplates(): ConversionTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (stored) {
      const templates = JSON.parse(stored);
      return templates.map((t: ConversionTemplate) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      }));
    }
  } catch (error) {
    console.error("Failed to load custom templates:", error);
  }

  return [];
}

// Save custom templates to localStorage
export function saveCustomTemplates(templates: ConversionTemplate[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    // Filter out builtin templates
    const customOnly = templates.filter(
      (t) => !BUILTIN_TEMPLATES.some((bt) => bt.id === t.id)
    );
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customOnly));
    return true;
  } catch (error) {
    console.error("Failed to save custom templates:", error);
    return false;
  }
}

// Add a custom template
export function addCustomTemplate(template: Omit<ConversionTemplate, "id" | "createdAt" | "updatedAt">): ConversionTemplate {
  const newTemplate: ConversionTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const customTemplates = loadCustomTemplates();
  customTemplates.push(newTemplate);
  saveCustomTemplates(customTemplates);

  return newTemplate;
}

// Update a template (only custom templates can be updated)
export function updateTemplate(id: string, updates: Partial<ConversionTemplate>): ConversionTemplate | null {
  const customTemplates = loadCustomTemplates();
  const index = customTemplates.findIndex((t) => t.id === id);

  if (index === -1) {
    // Check if it's a builtin template - create a copy as custom
    const builtin = BUILTIN_TEMPLATES.find((t) => t.id === id);
    if (builtin) {
      const customCopy: ConversionTemplate = {
        ...builtin,
        ...updates,
        id: `custom-${id}-${Date.now()}`,
        isDefault: false,
        updatedAt: new Date(),
      };
      customTemplates.push(customCopy);
      saveCustomTemplates(customTemplates);
      return customCopy;
    }
    return null;
  }

  customTemplates[index] = {
    ...customTemplates[index],
    ...updates,
    updatedAt: new Date(),
  };
  saveCustomTemplates(customTemplates);

  return customTemplates[index];
}

// Delete a custom template (builtin templates cannot be deleted)
export function deleteTemplate(id: string): boolean {
  if (BUILTIN_TEMPLATES.some((t) => t.id === id)) {
    return false; // Cannot delete builtin templates
  }

  const customTemplates = loadCustomTemplates();
  const filtered = customTemplates.filter((t) => t.id !== id);

  if (filtered.length === customTemplates.length) {
    return false; // Template not found
  }

  saveCustomTemplates(filtered);
  return true;
}

// Get builtin templates only
export function getBuiltinTemplates(): ConversionTemplate[] {
  return [...BUILTIN_TEMPLATES];
}

// Export templates to JSON/YAML format
export function exportTemplates(templates: ConversionTemplate[]): string {
  return JSON.stringify(templates, null, 2);
}

// Import templates from JSON
export function importTemplates(jsonStr: string): ConversionTemplate[] {
  try {
    const imported = JSON.parse(jsonStr);
    const templates: ConversionTemplate[] = [];

    for (const t of imported) {
      const template: ConversionTemplate = {
        ...t,
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      templates.push(template);
    }

    const customTemplates = loadCustomTemplates();
    customTemplates.push(...templates);
    saveCustomTemplates(customTemplates);

    return templates;
  } catch (error) {
    console.error("Failed to import templates:", error);
    throw new Error("Invalid template format");
  }
}
