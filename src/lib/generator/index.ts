import type { ControlMJob } from "@/types/controlm";
import type { AirflowDAG, GeneratedDAG } from "@/types/airflow";
import {
  generateDagCode,
  convertJobToTask,
  buildDependencies,
  groupJobsByFolder,
  type AirflowVersion,
  type GeneratorOptions,
} from "./dag-generator";

export interface GenerateDagsOptions {
  templateId?: string;
  airflowVersion?: AirflowVersion;
  useTaskFlowApi?: boolean;
}

export async function generateDags(
  jobs: ControlMJob[],
  templateIdOrOptions: string | GenerateDagsOptions = "default"
): Promise<GeneratedDAG[]> {
  // Handle backwards compatibility
  const options: GenerateDagsOptions =
    typeof templateIdOrOptions === "string"
      ? { templateId: templateIdOrOptions }
      : templateIdOrOptions;

  const { airflowVersion = "2.9", useTaskFlowApi = false } = options;

  const generatedDags: GeneratedDAG[] = [];

  // Group jobs by folder to create separate DAGs
  const jobsByFolder = groupJobsByFolder(jobs);

  for (const [folderName, folderJobs] of jobsByFolder) {
    // Convert jobs to tasks
    const tasks = folderJobs.map(convertJobToTask);

    // Build dependencies
    const dependencies = buildDependencies(folderJobs);

    // Create DAG definition
    const dag: AirflowDAG = {
      dagId: toSnakeCase(folderName),
      description: `Migrated from Control-M folder: ${folderName}`,
      schedule: "None",
      tags: ["control-m-migration", folderName.toLowerCase()],
      defaultArgs: {
        owner: "airflow",
        retries: 1,
        retryDelay: 5,
        emailOnFailure: false,
        emailOnRetry: false,
      },
      tasks,
      dependencies,
    };

    // Generate code with version-specific template
    const content = generateDagCode(dag, {
      airflowVersion,
      useTaskFlowApi,
    });

    generatedDags.push({
      filename: `${toSnakeCase(folderName)}_dag.py`,
      content,
      dag,
    });
  }

  return generatedDags;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/[-\s]+/g, "_")
    .replace(/^_/, "")
    .replace(/_+/g, "_")
    .toLowerCase();
}

export { generateDagCode, convertJobToTask, buildDependencies } from "./dag-generator";
export type { AirflowVersion, GeneratorOptions } from "./dag-generator";
