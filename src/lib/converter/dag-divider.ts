/**
 * DAG Divider - Split Control-M jobs into multiple DAGs
 * Inspired by dagify's dag_divider functionality
 */

import type { ControlMJob } from "@/types/controlm";

export type DivideStrategy =
  | "folder"        // One DAG per FOLDER_NAME
  | "application"   // One DAG per APPLICATION
  | "sub_application" // One DAG per SUB_APPLICATION
  | "single"        // All jobs in one DAG
  | "custom";       // Custom grouping by field

export interface DivideOptions {
  strategy: DivideStrategy;
  customField?: string;       // Field name for custom strategy
  maxJobsPerDag?: number;     // Split if DAG exceeds this many jobs
  preserveDependencies?: boolean; // Keep dependent jobs together
}

export interface DividedGroup {
  groupId: string;
  groupName: string;
  jobs: ControlMJob[];
  metadata: {
    strategy: DivideStrategy;
    field?: string;
    jobCount: number;
    hasExternalDependencies: boolean;
  };
}

/**
 * Divide jobs into groups for DAG generation
 */
export function divideJobs(
  jobs: ControlMJob[],
  options: DivideOptions = { strategy: "folder" }
): DividedGroup[] {
  const { strategy, customField, maxJobsPerDag, preserveDependencies } = options;

  let groups: Map<string, ControlMJob[]>;

  switch (strategy) {
    case "folder":
      groups = groupByField(jobs, "FOLDER_NAME");
      break;
    case "application":
      groups = groupByField(jobs, "APPLICATION");
      break;
    case "sub_application":
      groups = groupByField(jobs, "SUB_APPLICATION");
      break;
    case "single":
      groups = new Map([["all_jobs", jobs]]);
      break;
    case "custom":
      if (!customField) {
        throw new Error("Custom field required for custom strategy");
      }
      groups = groupByField(jobs, customField);
      break;
    default:
      groups = groupByField(jobs, "FOLDER_NAME");
  }

  // Apply max jobs per DAG splitting if needed
  if (maxJobsPerDag && maxJobsPerDag > 0) {
    groups = splitLargeGroups(groups, maxJobsPerDag);
  }

  // Preserve dependencies - move dependent jobs to same group
  if (preserveDependencies) {
    groups = mergeDependentGroups(groups, jobs);
  }

  // Convert to DividedGroup array
  const dividedGroups: DividedGroup[] = [];

  for (const [groupName, groupJobs] of groups) {
    const hasExternalDeps = checkExternalDependencies(groupJobs, groups);

    dividedGroups.push({
      groupId: generateGroupId(groupName),
      groupName,
      jobs: groupJobs,
      metadata: {
        strategy,
        field: customField || getStrategyField(strategy),
        jobCount: groupJobs.length,
        hasExternalDependencies: hasExternalDeps,
      },
    });
  }

  return dividedGroups;
}

/**
 * Group jobs by a specific field
 */
function groupByField(
  jobs: ControlMJob[],
  fieldName: string
): Map<string, ControlMJob[]> {
  const groups = new Map<string, ControlMJob[]>();

  for (const job of jobs) {
    const fieldValue = (job as Record<string, unknown>)[fieldName] as string || "default";
    const existing = groups.get(fieldValue) || [];
    existing.push(job);
    groups.set(fieldValue, existing);
  }

  return groups;
}

/**
 * Split groups that exceed max jobs
 */
function splitLargeGroups(
  groups: Map<string, ControlMJob[]>,
  maxJobs: number
): Map<string, ControlMJob[]> {
  const result = new Map<string, ControlMJob[]>();

  for (const [groupName, jobs] of groups) {
    if (jobs.length <= maxJobs) {
      result.set(groupName, jobs);
    } else {
      // Split into multiple groups
      let partNum = 1;
      for (let i = 0; i < jobs.length; i += maxJobs) {
        const partJobs = jobs.slice(i, i + maxJobs);
        result.set(`${groupName}_part${partNum}`, partJobs);
        partNum++;
      }
    }
  }

  return result;
}

/**
 * Merge groups that have dependencies between them
 */
function mergeDependentGroups(
  groups: Map<string, ControlMJob[]>,
  allJobs: ControlMJob[]
): Map<string, ControlMJob[]> {
  // Build a map of job names to group names
  const jobToGroup = new Map<string, string>();
  for (const [groupName, jobs] of groups) {
    for (const job of jobs) {
      jobToGroup.set(job.JOBNAME, groupName);
    }
  }

  // Find cross-group dependencies
  const mergeMap = new Map<string, string>(); // Maps group to merged group

  for (const job of allJobs) {
    const jobGroup = jobToGroup.get(job.JOBNAME);
    if (!jobGroup) continue;

    // Check INCOND for dependencies
    if (job.INCOND) {
      for (const cond of job.INCOND) {
        // Find which job produces this condition
        const producerJob = allJobs.find(
          (j) => j.OUTCOND?.some((oc) => oc.NAME === cond.NAME)
        );
        if (producerJob) {
          const producerGroup = jobToGroup.get(producerJob.JOBNAME);
          if (producerGroup && producerGroup !== jobGroup) {
            // Mark for merge
            mergeMap.set(jobGroup, producerGroup);
          }
        }
      }
    }
  }

  // Apply merges (simplified - just moves jobs)
  const result = new Map<string, ControlMJob[]>();

  for (const [groupName, jobs] of groups) {
    const targetGroup = mergeMap.get(groupName) || groupName;
    const existing = result.get(targetGroup) || [];
    existing.push(...jobs);
    result.set(targetGroup, existing);
  }

  return result;
}

/**
 * Check if a group has dependencies on other groups
 */
function checkExternalDependencies(
  groupJobs: ControlMJob[],
  allGroups: Map<string, ControlMJob[]>
): boolean {
  const groupJobNames = new Set(groupJobs.map((j) => j.JOBNAME));

  // Get all condition names produced by this group
  const groupConditions = new Set<string>();
  for (const job of groupJobs) {
    if (job.OUTCOND) {
      for (const cond of job.OUTCOND) {
        groupConditions.add(cond.NAME);
      }
    }
  }

  // Check if any job in this group depends on conditions from other groups
  for (const job of groupJobs) {
    if (job.INCOND) {
      for (const cond of job.INCOND) {
        if (!groupConditions.has(cond.NAME)) {
          // This condition must come from another group
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Generate a safe group ID
 */
function generateGroupId(groupName: string): string {
  return groupName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Get field name for strategy
 */
function getStrategyField(strategy: DivideStrategy): string {
  switch (strategy) {
    case "folder":
      return "FOLDER_NAME";
    case "application":
      return "APPLICATION";
    case "sub_application":
      return "SUB_APPLICATION";
    default:
      return "";
  }
}

/**
 * Get available divider strategies
 */
export function getDividerStrategies(): Array<{
  value: DivideStrategy;
  label: string;
  description: string;
}> {
  return [
    {
      value: "folder",
      label: "By Folder",
      description: "Create one DAG per Control-M folder",
    },
    {
      value: "application",
      label: "By Application",
      description: "Create one DAG per application",
    },
    {
      value: "sub_application",
      label: "By Sub-Application",
      description: "Create one DAG per sub-application",
    },
    {
      value: "single",
      label: "Single DAG",
      description: "All jobs in one DAG",
    },
    {
      value: "custom",
      label: "Custom Field",
      description: "Group by a custom field",
    },
  ];
}
