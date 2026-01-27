// Control-M Job Definition Types

export interface ControlMJob {
  JOBNAME: string;
  FOLDER_NAME?: string;
  APPLICATION?: string;
  SUB_APPLICATION?: string;
  JOB_TYPE?: string;
  DESCRIPTION?: string;

  // Command/Script
  CMDLINE?: string;
  FILENAME?: string;

  // Scheduling
  DAYS?: string;
  DAYSCAL?: string;
  WEEKSCAL?: string;
  CONFCAL?: string;
  TIMEFROM?: string;
  TIMEUNTIL?: string;
  TIMEZONE?: string;

  // Resources
  RUN_AS?: string;
  HOST?: string;
  HOSTGRP?: string;
  NODEID?: string;

  // Dependencies
  INCOND?: ControlMCondition[];
  OUTCOND?: ControlMCondition[];

  // Variables
  VARIABLE?: ControlMVariable[];

  // Quantitative resources
  QUANTITATIVE?: ControlMQuantitative[];

  // Additional properties
  MAXRERUN?: number;
  MAXWAIT?: number;
  PRIORITY?: string;
  CRITICAL?: string;

  // Raw properties for unmapped fields
  [key: string]: unknown;
}

export interface ControlMCondition {
  NAME: string;
  ODATE?: string;
  AND_OR?: 'AND' | 'OR';
  SIGN?: '+' | '-';
}

export interface ControlMVariable {
  NAME: string;
  VALUE: string;
}

export interface ControlMQuantitative {
  NAME: string;
  QUANTITY: number;
}

export interface ControlMFolder {
  FOLDER_NAME: string;
  DATACENTER?: string;
  JOBS: ControlMJob[];

  // Additional folder properties
  [key: string]: unknown;
}

export interface ControlMDefinition {
  folders: ControlMFolder[];
  jobs: ControlMJob[];
  metadata?: {
    source: 'xml' | 'json';
    version?: string;
    exportDate?: string;
  };
}

// Job type constants
export const CONTROLM_JOB_TYPES = {
  COMMAND: 'Command',
  OS: 'OS',
  SCRIPT: 'Script',
  FILE_WATCHER: 'FileWatcher',
  DATABASE: 'Database',
  SAP: 'SAP',
  INFORMATICA: 'Informatica',
  HADOOP: 'Hadoop',
  AWS: 'AWS',
  AZURE: 'Azure',
  WEB_SERVICES: 'WebServices',
} as const;

export type ControlMJobType = typeof CONTROLM_JOB_TYPES[keyof typeof CONTROLM_JOB_TYPES];
