// Template System Types

export interface ConversionTemplate {
  id: string;
  name: string;
  description?: string;

  // Matching conditions
  conditions: TemplateCondition[];

  // Mapping rules
  mappings: MappingRule[];

  // Output template (Handlebars)
  outputTemplate: string;

  // Metadata
  isDefault: boolean;
  isActive: boolean;
  priority: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  caseSensitive?: boolean;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'is_empty'
  | 'is_not_empty';

export interface MappingRule {
  id: string;
  source: string; // Control-M field path
  target: string; // Airflow field path
  transform?: TransformType;
  defaultValue?: string;
  required?: boolean;
}

export type TransformType =
  | 'none'
  | 'lowercase'
  | 'uppercase'
  | 'camel_case'
  | 'trim'
  | 'replace_spaces'
  | 'custom';

// Template validation
export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: string[];
}

export interface TemplateValidationError {
  field: string;
  message: string;
}

// Template matching
export interface TemplateMatchResult {
  template: ConversionTemplate;
  score: number;
  matchedConditions: string[];
}

// Predefined field options
export const CONTROLM_FIELDS = [
  'JOBNAME',
  'FOLDER_NAME',
  'APPLICATION',
  'SUB_APPLICATION',
  'JOB_TYPE',
  'DESCRIPTION',
  'CMDLINE',
  'FILENAME',
  'RUN_AS',
  'HOST',
  'TIMEFROM',
  'TIMEUNTIL',
  'TIMEZONE',
  'PRIORITY',
  'CRITICAL',
] as const;

export const AIRFLOW_FIELDS = [
  'task_id',
  'dag_id',
  'operator',
  'bash_command',
  'python_callable',
  'schedule',
  'owner',
  'retries',
  'retry_delay',
  'pool',
  'queue',
  'priority_weight',
  'trigger_rule',
] as const;

// Form schema for template editor
export interface TemplateFormData {
  name: string;
  description: string;
  conditions: TemplateCondition[];
  mappings: MappingRule[];
  outputTemplate: string;
  isActive: boolean;
  priority: number;
}

// Default template for quick start
export const DEFAULT_TEMPLATE_OUTPUT = `{{task_id}} = {{operator}}(
    task_id='{{task_id}}',
{{#if bash_command}}
    bash_command='''{{bash_command}}''',
{{/if}}
{{#if python_callable}}
    python_callable={{python_callable}},
{{/if}}
{{#if retries}}
    retries={{retries}},
{{/if}}
    dag=dag
)`;
