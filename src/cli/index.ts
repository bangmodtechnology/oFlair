#!/usr/bin/env node
/**
 * OFlair CLI - Command-line interface for Control-M to Airflow conversion
 *
 * Usage:
 *   npx oflair convert input.xml -o output/
 *   npx oflair convert input.json --airflow-version 3.1 --strategy folder
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { basename, join, extname } from "path";
import { parseControlMXml } from "../lib/parser/xml-parser";
import { parseControlMJson } from "../lib/parser/json-parser";
import { convertControlMToAirflow, type AirflowVersion, type ConversionOptions } from "../lib/converter";
import { formatReportAsText } from "../lib/converter/report";

interface CLIOptions {
  input: string;
  output: string;
  airflowVersion: AirflowVersion;
  strategy: "folder" | "application" | "sub_application" | "single";
  owner: string;
  retries: number;
  retryDelay: number;
  prefix: string;
  suffix: string;
  includeComments: boolean;
  useTaskFlowApi: boolean;
  verbose: boolean;
  reportFormat: "text" | "json";
}

const DEFAULT_OPTIONS: CLIOptions = {
  input: "",
  output: "./output",
  airflowVersion: "3.1",
  strategy: "folder",
  owner: "airflow",
  retries: 1,
  retryDelay: 5,
  prefix: "",
  suffix: "_dag",
  includeComments: true,
  useTaskFlowApi: false,
  verbose: false,
  reportFormat: "text",
};

function printUsage(): void {
  console.log(`
OFlair CLI - Control-M to Airflow Converter

Usage:
  npx oflair convert <input-file> [options]
  npx oflair --help
  npx oflair --version

Commands:
  convert <file>    Convert Control-M XML/JSON file to Airflow DAGs

Options:
  -o, --output <dir>           Output directory (default: ./output)
  -v, --airflow-version <ver>  Airflow version: 2.5-3.1 (default: 3.1)
  -s, --strategy <strategy>    DAG divide strategy: folder|application|sub_application|single (default: folder)
  --owner <name>               DAG owner (default: airflow)
  --retries <n>                Default retries (default: 1)
  --retry-delay <min>          Retry delay in minutes (default: 5)
  --prefix <str>               DAG ID prefix
  --suffix <str>               DAG ID suffix (default: _dag)
  --no-comments                Disable comments in generated code
  --taskflow                   Use TaskFlow API (Airflow 3.x)
  --report <format>            Report format: text|json (default: text)
  --verbose                    Verbose output
  -h, --help                   Show this help
  --version                    Show version

Examples:
  npx oflair convert jobs.xml -o dags/
  npx oflair convert jobs.json -v 3.0 -s application
  npx oflair convert batch.xml --owner data-team --taskflow
`);
}

function printVersion(): void {
  console.log("OFlair CLI v0.1.0");
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = { ...DEFAULT_OPTIONS };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
      case "--version":
        printVersion();
        process.exit(0);
      case "-o":
      case "--output":
        options.output = args[++i] || DEFAULT_OPTIONS.output;
        break;
      case "-v":
      case "--airflow-version":
        options.airflowVersion = args[++i] as AirflowVersion || DEFAULT_OPTIONS.airflowVersion;
        break;
      case "-s":
      case "--strategy":
        options.strategy = args[++i] as CLIOptions["strategy"] || DEFAULT_OPTIONS.strategy;
        break;
      case "--owner":
        options.owner = args[++i] || DEFAULT_OPTIONS.owner;
        break;
      case "--retries":
        options.retries = parseInt(args[++i]) || DEFAULT_OPTIONS.retries;
        break;
      case "--retry-delay":
        options.retryDelay = parseInt(args[++i]) || DEFAULT_OPTIONS.retryDelay;
        break;
      case "--prefix":
        options.prefix = args[++i] || "";
        break;
      case "--suffix":
        options.suffix = args[++i] || DEFAULT_OPTIONS.suffix;
        break;
      case "--no-comments":
        options.includeComments = false;
        break;
      case "--taskflow":
        options.useTaskFlowApi = true;
        break;
      case "--report":
        options.reportFormat = args[++i] as "text" | "json" || DEFAULT_OPTIONS.reportFormat;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "convert":
        // Skip command name
        break;
      default:
        if (!arg.startsWith("-") && !options.input) {
          options.input = arg;
        }
        break;
    }
    i++;
  }

  return options;
}

function log(options: CLIOptions, ...args: unknown[]): void {
  if (options.verbose) {
    console.log("[INFO]", ...args);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  if (args[0] === "--version") {
    printVersion();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.input) {
    console.error("Error: No input file specified");
    console.error("Usage: npx oflair convert <input-file> [options]");
    process.exit(1);
  }

  if (!existsSync(options.input)) {
    console.error(`Error: Input file not found: ${options.input}`);
    process.exit(1);
  }

  log(options, `Reading file: ${options.input}`);

  // Read and parse input file
  const content = readFileSync(options.input, "utf-8");
  const ext = extname(options.input).toLowerCase();

  let definition;
  try {
    if (ext === ".xml") {
      log(options, "Parsing XML...");
      definition = parseControlMXml(content);
    } else if (ext === ".json") {
      log(options, "Parsing JSON...");
      definition = parseControlMJson(content);
    } else {
      // Try to detect format
      if (content.trim().startsWith("<")) {
        log(options, "Auto-detected XML format");
        definition = parseControlMXml(content);
      } else {
        log(options, "Auto-detected JSON format");
        definition = parseControlMJson(content);
      }
    }
  } catch (error) {
    console.error("Error parsing input file:", error instanceof Error ? error.message : error);
    process.exit(1);
  }

  log(options, `Found ${definition.jobs.length} jobs`);

  // Convert
  const conversionOptions: ConversionOptions = {
    airflowVersion: options.airflowVersion,
    useTaskFlowApi: options.useTaskFlowApi,
    defaultOwner: options.owner,
    defaultRetries: options.retries,
    defaultRetryDelay: options.retryDelay,
    dagIdPrefix: options.prefix,
    dagIdSuffix: options.suffix,
    includeComments: options.includeComments,
    divideStrategy: {
      strategy: options.strategy,
    },
  };

  log(options, "Converting to Airflow DAGs...");

  let result;
  try {
    result = await convertControlMToAirflow(definition.jobs, conversionOptions);
  } catch (error) {
    console.error("Error during conversion:", error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Create output directory
  if (!existsSync(options.output)) {
    mkdirSync(options.output, { recursive: true });
    log(options, `Created output directory: ${options.output}`);
  }

  // Write DAG files
  for (const dag of result.dags) {
    const outputPath = join(options.output, dag.filename);
    writeFileSync(outputPath, dag.content, "utf-8");
    log(options, `Written: ${outputPath}`);
  }

  // Write report
  const reportFilename = options.reportFormat === "json"
    ? "conversion_report.json"
    : "CONVERSION_REPORT.txt";
  const reportContent = options.reportFormat === "json"
    ? JSON.stringify(result.report, null, 2)
    : formatReportAsText(result.report);
  writeFileSync(join(options.output, reportFilename), reportContent, "utf-8");

  // Summary
  console.log(`
✓ Conversion complete!

  Input:     ${basename(options.input)}
  Output:    ${options.output}/
  DAGs:      ${result.dags.length}
  Jobs:      ${result.report.summary.totalJobs}
  Converted: ${result.report.summary.convertedJobs}
  Warnings:  ${result.report.warnings.length}

  Files created:
${result.dags.map((d) => `    - ${d.filename}`).join("\n")}
    - ${reportFilename}
`);

  if (result.report.warnings.length > 0 && options.verbose) {
    console.log("Warnings:");
    for (const warning of result.report.warnings) {
      console.log(`  - [${warning.severity}] ${warning.jobName}: ${warning.message}`);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
