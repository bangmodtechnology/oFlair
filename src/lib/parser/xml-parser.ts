import { XMLParser } from "fast-xml-parser";
import type { ControlMJob, ControlMFolder, ControlMDefinition, ControlMCondition } from "@/types/controlm";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  trimValues: true,
});

export function parseControlMXml(xmlContent: string): ControlMDefinition {
  const parsed = xmlParser.parse(xmlContent);

  const folders: ControlMFolder[] = [];
  const jobs: ControlMJob[] = [];

  // Handle different XML structures
  const root = parsed.DEFTABLE || parsed.FOLDER || parsed.JOB || parsed;

  // Extract folders
  if (root.FOLDER) {
    const folderList = Array.isArray(root.FOLDER) ? root.FOLDER : [root.FOLDER];

    for (const folder of folderList) {
      const folderJobs = extractJobsFromFolder(folder);
      folders.push({
        FOLDER_NAME: folder.FOLDER_NAME || folder.NAME || "Unknown",
        DATACENTER: folder.DATACENTER,
        JOBS: folderJobs,
      });
      jobs.push(...folderJobs);
    }
  }

  // Handle standalone jobs (not in folders)
  if (root.JOB) {
    const jobList = Array.isArray(root.JOB) ? root.JOB : [root.JOB];
    const standaloneJobs = jobList.map(parseJob);
    jobs.push(...standaloneJobs);
  }

  // Handle SMART_FOLDER structure (newer Control-M versions)
  if (root.SMART_FOLDER) {
    const smartFolders = Array.isArray(root.SMART_FOLDER)
      ? root.SMART_FOLDER
      : [root.SMART_FOLDER];

    for (const sf of smartFolders) {
      const folderJobs = extractJobsFromFolder(sf);
      folders.push({
        FOLDER_NAME: sf.FOLDER_NAME || sf.NAME || "Unknown",
        DATACENTER: sf.DATACENTER,
        JOBS: folderJobs,
      });
      jobs.push(...folderJobs);
    }
  }

  return {
    folders,
    jobs,
    metadata: {
      source: "xml",
    },
  };
}

function extractJobsFromFolder(folder: Record<string, unknown>): ControlMJob[] {
  const jobs: ControlMJob[] = [];

  // Check for JOB elements
  if (folder.JOB) {
    const jobList = Array.isArray(folder.JOB) ? folder.JOB : [folder.JOB];
    for (const job of jobList) {
      const parsedJob = parseJob(job as Record<string, unknown>);
      parsedJob.FOLDER_NAME = folder.FOLDER_NAME as string || folder.NAME as string;
      jobs.push(parsedJob);
    }
  }

  // Check for JOBS container
  const jobsContainer = folder.JOBS as Record<string, unknown> | undefined;
  if (jobsContainer?.JOB) {
    const jobList = Array.isArray(jobsContainer.JOB)
      ? jobsContainer.JOB
      : [jobsContainer.JOB];
    for (const job of jobList) {
      const parsedJob = parseJob(job as Record<string, unknown>);
      parsedJob.FOLDER_NAME = folder.FOLDER_NAME as string || folder.NAME as string;
      jobs.push(parsedJob);
    }
  }

  return jobs;
}

function parseJob(jobData: Record<string, unknown>): ControlMJob {
  const job: ControlMJob = {
    JOBNAME: (jobData.JOBNAME || jobData.NAME || "Unknown") as string,
    FOLDER_NAME: jobData.FOLDER_NAME as string | undefined,
    APPLICATION: jobData.APPLICATION as string | undefined,
    SUB_APPLICATION: jobData.SUB_APPLICATION as string | undefined,
    JOB_TYPE: (jobData.JOB_TYPE || jobData.TASKTYPE || "Command") as string,
    DESCRIPTION: (jobData.DESCRIPTION || jobData.MEMNAME) as string | undefined,
    CMDLINE: jobData.CMDLINE as string | undefined,
    FILENAME: jobData.FILENAME as string | undefined,
    DAYS: jobData.DAYS as string | undefined,
    TIMEFROM: jobData.TIMEFROM as string | undefined,
    TIMEUNTIL: jobData.TIMEUNTIL as string | undefined,
    TIMEZONE: jobData.TIMEZONE as string | undefined,
    RUN_AS: (jobData.RUN_AS || jobData.OWNER) as string | undefined,
    HOST: (jobData.HOST || jobData.NODEID) as string | undefined,
    MAXRERUN: jobData.MAXRERUN as number | undefined,
    PRIORITY: jobData.PRIORITY as string | undefined,
    CRITICAL: jobData.CRITICAL as string | undefined,
  };

  // Parse conditions
  if (jobData.INCOND) {
    job.INCOND = parseConditions(jobData.INCOND);
  }
  if (jobData.OUTCOND) {
    job.OUTCOND = parseConditions(jobData.OUTCOND);
  }

  // Parse variables
  if (jobData.VARIABLE) {
    const vars = Array.isArray(jobData.VARIABLE)
      ? jobData.VARIABLE
      : [jobData.VARIABLE];
    job.VARIABLE = vars.map((v: Record<string, unknown>) => ({
      NAME: v.NAME as string,
      VALUE: v.VALUE as string,
    }));
  }

  return job;
}

function parseConditions(condData: unknown): ControlMCondition[] {
  const conditions: ControlMCondition[] = [];
  const condList = Array.isArray(condData) ? condData : [condData];

  for (const cond of condList) {
    if (typeof cond === "object" && cond !== null) {
      const c = cond as Record<string, unknown>;
      conditions.push({
        NAME: (c.NAME || c.COND_NAME) as string,
        ODATE: c.ODATE as string | undefined,
        AND_OR: c.AND_OR as "AND" | "OR" | undefined,
        SIGN: c.SIGN as "+" | "-" | undefined,
      });
    }
  }

  return conditions;
}
