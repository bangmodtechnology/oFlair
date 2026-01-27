import type { ControlMJob, ControlMFolder, ControlMDefinition, ControlMCondition } from "@/types/controlm";

export function parseControlMJson(jsonContent: string): ControlMDefinition {
  const parsed = JSON.parse(jsonContent);

  const folders: ControlMFolder[] = [];
  const jobs: ControlMJob[] = [];

  // Handle different JSON structures from Control-M

  // Structure 1: Direct jobs array
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item.jobs || item.JOBS) {
        // It's a folder
        const folderJobs = extractJobsFromObject(item.jobs || item.JOBS);
        folders.push({
          FOLDER_NAME: item.folder || item.FOLDER_NAME || item.name || "Unknown",
          DATACENTER: item.datacenter || item.DATACENTER,
          JOBS: folderJobs,
        });
        jobs.push(...folderJobs);
      } else {
        // It's a job
        jobs.push(parseJobFromJson(item));
      }
    }
  }

  // Structure 2: Object with folders
  else if (parsed.folders || parsed.FOLDERS) {
    const folderList = parsed.folders || parsed.FOLDERS;
    for (const folder of Object.values(folderList) as Record<string, unknown>[]) {
      const folderJobs = extractJobsFromObject(folder.jobs || folder.JOBS);
      folders.push({
        FOLDER_NAME: (folder.folder || folder.FOLDER_NAME || folder.name || "Unknown") as string,
        DATACENTER: folder.datacenter as string | undefined || folder.DATACENTER as string | undefined,
        JOBS: folderJobs,
      });
      jobs.push(...folderJobs);
    }
  }

  // Structure 3: Control-M Automation API format
  else if (parsed.DefineFolder || parsed.Folder) {
    const folderDef = parsed.DefineFolder || parsed.Folder;
    for (const [folderName, folderData] of Object.entries(folderDef) as [string, Record<string, unknown>][]) {
      const folderJobs: ControlMJob[] = [];

      for (const [key, value] of Object.entries(folderData)) {
        // Skip metadata fields
        if (["Type", "ControlmServer", "SiteStandard", "OrderMethod"].includes(key)) {
          continue;
        }

        // Check if it's a job definition
        if (typeof value === "object" && value !== null) {
          const jobData = value as Record<string, unknown>;
          if (jobData.Type === "Job" || jobData.Command || jobData.Script) {
            const job = parseJobFromJson({ ...jobData, JOBNAME: key });
            job.FOLDER_NAME = folderName;
            folderJobs.push(job);
          }
        }
      }

      if (folderJobs.length > 0) {
        folders.push({
          FOLDER_NAME: folderName,
          DATACENTER: folderData.ControlmServer as string | undefined,
          JOBS: folderJobs,
        });
        jobs.push(...folderJobs);
      }
    }
  }

  // Structure 4: Simple object with jobs
  else if (parsed.jobs || parsed.JOBS) {
    const jobsData = parsed.jobs || parsed.JOBS;
    const extractedJobs = extractJobsFromObject(jobsData);
    jobs.push(...extractedJobs);
  }

  return {
    folders,
    jobs,
    metadata: {
      source: "json",
    },
  };
}

function extractJobsFromObject(jobsData: unknown): ControlMJob[] {
  const jobs: ControlMJob[] = [];

  if (Array.isArray(jobsData)) {
    for (const job of jobsData) {
      jobs.push(parseJobFromJson(job));
    }
  } else if (typeof jobsData === "object" && jobsData !== null) {
    for (const [name, data] of Object.entries(jobsData)) {
      if (typeof data === "object" && data !== null) {
        jobs.push(parseJobFromJson({ ...data as Record<string, unknown>, JOBNAME: name }));
      }
    }
  }

  return jobs;
}

function parseJobFromJson(jobData: Record<string, unknown>): ControlMJob {
  // Normalize field names (handle both camelCase and UPPER_CASE)
  const job: ControlMJob = {
    JOBNAME: normalize(jobData, ["JOBNAME", "jobName", "name", "Name"]) as string || "Unknown",
    FOLDER_NAME: normalize(jobData, ["FOLDER_NAME", "folderName", "folder"]) as string | undefined,
    APPLICATION: normalize(jobData, ["APPLICATION", "application", "Application"]) as string | undefined,
    SUB_APPLICATION: normalize(jobData, ["SUB_APPLICATION", "subApplication", "SubApplication"]) as string | undefined,
    JOB_TYPE: normalize(jobData, ["JOB_TYPE", "jobType", "Type", "type"]) as string || "Command",
    DESCRIPTION: normalize(jobData, ["DESCRIPTION", "description", "Description"]) as string | undefined,
    CMDLINE: normalize(jobData, ["CMDLINE", "cmdline", "Command", "command"]) as string | undefined,
    FILENAME: normalize(jobData, ["FILENAME", "filename", "Script", "script", "FilePath"]) as string | undefined,
    DAYS: normalize(jobData, ["DAYS", "days", "When", "when"]) as string | undefined,
    TIMEFROM: normalize(jobData, ["TIMEFROM", "timeFrom", "StartTime"]) as string | undefined,
    TIMEUNTIL: normalize(jobData, ["TIMEUNTIL", "timeUntil", "EndTime"]) as string | undefined,
    TIMEZONE: normalize(jobData, ["TIMEZONE", "timezone", "TimeZone"]) as string | undefined,
    RUN_AS: normalize(jobData, ["RUN_AS", "runAs", "RunAs", "owner"]) as string | undefined,
    HOST: normalize(jobData, ["HOST", "host", "Host", "RunOn"]) as string | undefined,
    MAXRERUN: normalize(jobData, ["MAXRERUN", "maxRerun", "Rerun"]) as number | undefined,
    PRIORITY: normalize(jobData, ["PRIORITY", "priority", "Priority"]) as string | undefined,
    CRITICAL: normalize(jobData, ["CRITICAL", "critical", "Critical"]) as string | undefined,
  };

  // Parse conditions
  const inConds = normalize(jobData, ["INCOND", "inCond", "InConditions", "WaitForEvents"]);
  if (inConds) {
    job.INCOND = parseConditionsFromJson(inConds);
  }

  const outConds = normalize(jobData, ["OUTCOND", "outCond", "OutConditions", "AddEvents"]);
  if (outConds) {
    job.OUTCOND = parseConditionsFromJson(outConds);
  }

  // Parse variables
  const vars = normalize(jobData, ["VARIABLE", "variables", "Variables"]);
  if (vars && Array.isArray(vars)) {
    job.VARIABLE = vars.map((v: Record<string, unknown>) => ({
      NAME: (v.NAME || v.name) as string,
      VALUE: (v.VALUE || v.value) as string,
    }));
  }

  return job;
}

function normalize(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
  return undefined;
}

function parseConditionsFromJson(condData: unknown): ControlMCondition[] {
  const conditions: ControlMCondition[] = [];

  if (Array.isArray(condData)) {
    for (const cond of condData) {
      if (typeof cond === "string") {
        conditions.push({ NAME: cond });
      } else if (typeof cond === "object" && cond !== null) {
        const c = cond as Record<string, unknown>;
        conditions.push({
          NAME: (c.NAME || c.name || c.event) as string,
          ODATE: (c.ODATE || c.odate) as string | undefined,
          AND_OR: (c.AND_OR || c.andOr) as "AND" | "OR" | undefined,
          SIGN: (c.SIGN || c.sign) as "+" | "-" | undefined,
        });
      }
    }
  } else if (typeof condData === "object" && condData !== null) {
    for (const [name] of Object.entries(condData)) {
      conditions.push({ NAME: name });
    }
  }

  return conditions;
}
