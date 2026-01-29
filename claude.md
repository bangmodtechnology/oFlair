# OFlair - Control-M to Airflow Converter

## Project Overview

Web application สำหรับแปลง Control-M Job Definitions เป็น Apache Airflow DAGs พร้อม GUI ที่ใช้งานง่าย

**Tech Stack:**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS + Shadcn/ui
- Zustand (State Management)
- React Flow (DAG Visualization)
- Monaco Editor (Code Preview)
- Vitest (Testing)
- Prisma (ORM - SQLite/PostgreSQL)
- Tauri v2 (Desktop App)

---

## Features (Completed)

### Core Features
- [x] Upload Control-M XML/JSON files
- [x] Parse Control-M job definitions
- [x] Convert to Airflow DAG Python code
- [x] Support Airflow 2.5 - 3.1
- [x] Download generated DAGs (.py files)
- [x] Download all as ZIP with README + requirements.txt
- [x] Batch processing - Upload multiple files at once
- [x] DAG validation - Syntax check and circular dependency detection

### UI/UX
- [x] 5-Step Wizard (Upload → Select Jobs → Configure → Review → Result)
- [x] Job selection with checkbox
- [x] Code preview with Monaco Editor
- [x] Dependency Graph visualization (React Flow)
- [x] Dark/Light theme support
- [x] Responsive sidebar navigation
- [x] Search/filter jobs by name, type, or folder
- [x] Batch mode toggle for multi-file upload
- [x] Performance optimization for large files (1000+ jobs)

### Converter Engine
- [x] Rules Engine for transformations
- [x] DAG Divider (By Folder, Application, Single DAG)
- [x] Schedule Converter (Control-M → Cron)
- [x] Conversion Report with warnings
- [x] Dependency extraction (INCOND/OUTCOND)
- [x] Cross-DAG Dependencies (ExternalTaskSensor)
- [x] Settings integration (owner, retries, prefix/suffix)
- [x] Template-driven operator detection (YAML-based)
- [x] Custom calendar support (Airflow Timetables)

### Operators Supported
- [x] BashOperator
- [x] PythonOperator
- [x] EmptyOperator
- [x] FileSensor
- [x] KubernetesPodOperator
- [x] SSHOperator
- [x] WasbBlobSensor (Azure)
- [x] EmailOperator
- [x] SQLExecuteQueryOperator
- [x] SimpleHttpOperator
- [x] LambdaInvokeFunctionOperator (AWS)
- [x] S3CopyObjectOperator (AWS)
- [x] GlueJobOperator (AWS)
- [x] SapHanaOperator (SAP)
- [x] InformaticaCloudRunTaskOperator
- [x] SparkSubmitOperator
- [x] DatabricksSubmitRunOperator
- [x] SFTPOperator

### Other Features
- [x] Template management page
- [x] Conversion history page with view/download DAG code
- [x] Settings page with import/export
- [x] localStorage for config persistence
- [x] Export settings to JSON
- [x] Import settings from JSON
- [x] Storage abstraction layer (localStorage + Database via API)
- [x] Dual storage mode: Local Storage / Database (selectable in Settings)
- [x] Tauri v2 desktop app support (static export mode)
- [x] CLI mode for command-line conversion
- [x] Custom Rules Engine (value replace, field mapping, regex transform, conditional)
- [x] Rules management page with CRUD operations
- [x] Calendar UI Editor for holidays and scheduling patterns

---

## Project Structure

```
oflair/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Home/Dashboard
│   │   │   ├── convert/page.tsx      # 5-Step Converter Wizard
│   │   │   ├── templates/page.tsx    # Template Management
│   │   │   ├── history/page.tsx      # Conversion History + View/Download DAGs
│   │   │   ├── rules/page.tsx        # Custom Rules Management
│   │   │   ├── calendars/page.tsx    # Calendar/Holiday Editor
│   │   │   ├── settings/page.tsx     # Settings
│   │   │   └── layout.tsx            # Dashboard Layout with Sidebar
│   │   ├── api/
│   │   │   ├── config/route.ts       # Config CRUD API
│   │   │   └── history/route.ts      # History List/Create/Delete API
│   │   ├── layout.tsx                # Root Layout
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/ui Components
│   │   ├── converter/
│   │   │   ├── file-uploader.tsx     # Drag & Drop File Upload
│   │   │   ├── job-preview.tsx       # Job Selection List
│   │   │   ├── output-viewer.tsx     # Code/Graph View Toggle
│   │   │   ├── dependency-graph.tsx  # React Flow DAG Visualization
│   │   │   └── conversion-report.tsx # Report Display
│   │   └── shared/
│   │       └── app-sidebar.tsx       # Navigation Sidebar
│   │
│   ├── lib/
│   │   ├── parser/
│   │   │   ├── index.ts              # Parser Entry Point
│   │   │   ├── xml-parser.ts         # Control-M XML Parser
│   │   │   └── json-parser.ts        # Control-M JSON Parser
│   │   ├── converter/
│   │   │   ├── index.ts              # Main Converter Engine
│   │   │   ├── rules.ts              # Transformation Rules
│   │   │   ├── dag-divider.ts        # DAG Splitting Strategies
│   │   │   ├── schedule-converter.ts # Cron Expression Converter
│   │   │   ├── report.ts             # Conversion Report Generator
│   │   │   ├── validator.ts          # DAG Validation
│   │   │   ├── export.ts             # Download/Export Utilities
│   │   │   └── custom-rules-engine.ts # Custom Rules Engine
│   │   ├── generator/
│   │   │   ├── index.ts
│   │   │   └── dag-generator.ts      # Legacy Generator
│   │   ├── templates/
│   │   │   ├── template-loader.ts    # YAML Template Loader (18 operators)
│   │   │   └── template-matcher.ts   # Template Matching Engine
│   │   └── storage/
│   │       ├── config-storage.ts     # localStorage Wrapper
│   │       └── storage-interface.ts  # Storage Abstraction Layer
│   │
│   ├── store/
│   │   ├── converter-store.ts        # Zustand Store for Converter
│   │   └── template-store.ts         # Zustand Store for Templates
│   │
│   ├── types/
│   │   ├── controlm.ts               # Control-M Types
│   │   ├── airflow.ts                # Airflow Types
│   │   └── template.ts               # Template Types
│   │
│   ├── hooks/
│   │   ├── use-mobile.ts             # Mobile Detection Hook
│   │   └── use-storage.ts            # Storage Provider Hook + Tauri Detection
│   │
│   ├── cli/
│   │   └── index.ts                  # CLI Entry Point
│   │
│   └── __tests__/                    # Unit Tests
│       ├── parser.test.ts            # XML Parser Tests
│       ├── rules.test.ts             # Rules Engine Tests
│       ├── validator.test.ts         # DAG Validator Tests
│       ├── template-matcher.test.ts  # Template Matcher Tests
│       └── schedule-converter.test.ts # Schedule/Calendar Tests
│
├── templates/                        # YAML Operator Templates
│   ├── bash-operator.yaml
│   ├── python-operator.yaml
│   ├── file-sensor.yaml
│   ├── empty-operator.yaml
│   ├── kubernetes-pod-operator.yaml
│   ├── azure-blob-operator.yaml
│   ├── ssh-operator.yaml
│   └── email-operator.yaml
│
├── samples/                          # Sample Control-M Files
├── prisma/                           # Prisma Schema (SQLite/PostgreSQL)
├── src-tauri/                        # Tauri v2 Desktop App
│   ├── tauri.conf.json               # Tauri Configuration
│   ├── Cargo.toml                    # Rust Dependencies
│   ├── build.rs                      # Tauri Build Script
│   └── src/
│       ├── lib.rs                    # App Entry Point
│       └── main.rs                   # Main Binary
└── public/
```

---

## Conversion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. Upload  │────▶│  2. Parse   │────▶│  3. Select  │────▶│ 4. Convert  │
│    File     │     │   XML/JSON  │     │    Jobs     │     │   to DAG    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │ 5. Download │
                                                            │   Result    │
                                                            └─────────────┘
```

### Converter Engine Pipeline

```
Jobs → Rules Transform → DAG Divider → Code Generator → Python Files
          │                  │               │
          ▼                  ▼               ▼
      Normalize         Group by        Generate
      Job Names        Folder/App       Imports +
      & Values                          Tasks +
                                       Dependencies
```

---

## Key Components

### 1. Parser (`src/lib/parser/`)
- Parses Control-M XML using `fast-xml-parser`
- Extracts jobs, folders, conditions, variables
- Normalizes to `ControlMJob` type

### 2. Converter Engine (`src/lib/converter/`)
- **Rules Engine**: Transform values (lowercase, escape, prefix, etc.)
- **DAG Divider**: Split jobs into multiple DAGs by folder/application
- **Schedule Converter**: Convert Control-M schedule to cron expression
- **Report Generator**: Generate conversion report with warnings

### 3. Code Generator (`src/lib/converter/index.ts`)
- Generates Python code for Airflow DAGs
- Supports Airflow 2.x and 3.x import paths
- Optional TaskFlow API (@dag decorator)
- Includes comments and docstrings

### 4. Dependency Graph (`src/components/converter/dependency-graph.tsx`)
- Uses React Flow (@xyflow/react)
- Auto-layout based on dependency hierarchy
- Color-coded nodes by operator type
- Interactive zoom/pan/drag

### 5. Template System (`src/lib/templates/`)
- **Template Loader**: Defines 18 operator templates with conditions and mappings
- **Template Matcher**: Matches jobs to templates using condition evaluation
- Condition operators: equals, not_equals, contains, starts_with, ends_with, regex, is_empty, is_not_empty
- Mapping transforms: lowercase, uppercase, trim, camel_case, replace_spaces

### 6. Calendar Support (`src/lib/converter/schedule-converter.ts`)
- Converts Control-M DAYSCAL to Airflow Timetables
- Auto-detects calendar types: business_days, holidays, weekly_pattern, custom
- Generates complete Timetable Python classes for each calendar type
- Handles SHIFT directives (PREVDAY, NEXTDAY, business day shifts)

---

## Configuration

### Settings (localStorage)

```typescript
interface AppConfig {
  defaultOwner: string;      // DAG owner
  defaultRetries: number;    // Retry count
  defaultRetryDelay: number; // Minutes
  dagIdPrefix: string;       // e.g., "ctm_"
  dagIdSuffix: string;       // e.g., "_dag"
  includeComments: boolean;  // Add comments to code
}
```

### Convert Page Options
- **Airflow Version**: 2.5 - 3.1
- **DAG Grouping**: By Folder / Application / Single DAG
- **TaskFlow API**: @dag decorator (Airflow 3.x only)

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint

# CLI Mode
npm run cli -- convert input.xml -o output/        # Convert via CLI
npm run build:cli                                  # Build standalone CLI

# Tauri Desktop App
npm run tauri:dev        # Development with hot reload
npm run tauri:build      # Build distributable binary
npm run build:static     # Next.js static export (for Tauri)
```

---

## CLI Usage

OFlair includes a command-line interface for batch conversion without the web UI.

```bash
# Using npm run cli
npm run cli -- convert <input-file> [options]

# Using built binary (after npm run build:cli)
npx oflair convert <input-file> [options]
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./output` |
| `-v, --airflow-version <ver>` | Airflow version (2.5-3.1) | `3.1` |
| `-s, --strategy <strategy>` | DAG grouping: folder, application, sub_application, single | `folder` |
| `--owner <name>` | DAG owner | `airflow` |
| `--retries <n>` | Default retry count | `1` |
| `--retry-delay <min>` | Retry delay in minutes | `5` |
| `--prefix <str>` | DAG ID prefix | (none) |
| `--suffix <str>` | DAG ID suffix | `_dag` |
| `--no-comments` | Disable comments in generated code | (enabled) |
| `--taskflow` | Use TaskFlow API (Airflow 3.x) | (disabled) |
| `--report <format>` | Report format: text or json | `text` |
| `--verbose` | Verbose output | (disabled) |

### CLI Examples

```bash
# Basic conversion
npm run cli -- convert jobs.xml -o dags/

# Convert with options
npm run cli -- convert batch.xml -v 3.0 -s application --owner data-team

# Use TaskFlow API
npm run cli -- convert etl.json --taskflow --verbose

# Build standalone CLI
npm run build:cli
./dist/cli/index.js convert input.xml -o output/
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| next | React Framework |
| zustand | State Management |
| @xyflow/react | DAG Visualization |
| @monaco-editor/react | Code Editor |
| fast-xml-parser | XML Parsing |
| jszip | ZIP Generation |
| sonner | Toast Notifications |
| lucide-react | Icons |
| @prisma/client | Database ORM |
| @tauri-apps/cli | Desktop App Build Tool (dev) |

---

## Testing

```bash
# Run tests
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

**Test coverage (163 tests):**
- `src/__tests__/rules.test.ts` - Rules engine (32 tests)
- `src/__tests__/parser.test.ts` - XML parser (12 tests)
- `src/__tests__/validator.test.ts` - DAG validator (21 tests)
- `src/__tests__/template-matcher.test.ts` - Template matching (39 tests)
- `src/__tests__/schedule-converter.test.ts` - Schedule & calendar (59 tests)

---

## TODO / Future Improvements

### High Priority (Completed)
- [x] **Integrate Settings into Converter** - Load defaultOwner, dagIdPrefix from settings
- [x] **Validate Generated DAG** - Syntax check Python code
- [x] **Add Unit Tests** - Parser, Converter, Rules, Templates, Schedule (163 tests)

### Medium Priority (Completed)
- [x] **Support More Job Types** - SAP, Informatica, AWS Lambda, Spark, Databricks, SFTP
- [x] **Cross-DAG Dependencies** - ExternalTaskSensor for split DAGs
- [x] **Batch Processing** - Multiple files at once with batch mode toggle
- [x] **Import/Export Settings** - JSON export/import for settings and history

### Low Priority (Completed)
- [x] **Performance Optimization** - Search/filter, lazy rendering for large files
- [x] **Storage Abstraction** - Interface for future database support

### Future Enhancements (Completed)
- [x] **Database Storage** - Optional SQLite/PostgreSQL via Prisma + API routes, selectable in Settings
- [x] **Desktop App** - Tauri v2 wrapper with static export support

### Known Issues (Resolved)
- [x] Large files may slow down browser (1000+ jobs) - Added search, lazy rendering, and folder batching

---

## Recent Additions (v0.1.0)

### Template-Driven Operator Detection
Jobs are matched to Airflow operators using configurable templates with conditions:
- **Condition-based matching**: Match by JOB_TYPE, CMDLINE, file extensions, etc.
- **Priority scoring**: Higher priority templates override lower ones
- **18 built-in operators**: Bash, Python, File, Kubernetes, SSH, Azure, Email, HTTP, SQL, AWS (Lambda, S3, Glue), SAP HANA, Informatica, Spark, Databricks, SFTP

### CLI Mode
Command-line interface for automation and CI/CD pipelines:
- Convert files without web UI
- Supports all conversion options via flags
- Generates conversion report (text or JSON)
- Can be built as standalone binary

### Custom Calendar Support
Control-M calendars (DAYSCAL) are converted to Airflow Timetables:
- **Business days**: Monday-Friday with holiday exclusions
- **Holidays**: Skip specific dates
- **Weekly patterns**: Custom day-of-week patterns
- **Custom**: Template for any scheduling logic

---

### TODO
-  จัดเรียงเมนูให้ใช้งานหรือตั้งค่าต่างๆได้ง่ายขึ้น




## Sample Control-M XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<DEFTABLE>
  <FOLDER FOLDER_NAME="BATCH_FOLDER" DATACENTER="DC1">
    <JOB JOBNAME="JOB_001"
         APPLICATION="ETL"
         JOB_TYPE="Command"
         CMDLINE="python /scripts/etl.py">
      <INCOND NAME="JOB_000-ENDED-OK"/>
      <OUTCOND NAME="JOB_001-ENDED-OK"/>
      <VARIABLE NAME="ENV" VALUE="production"/>
    </JOB>
  </FOLDER>
</DEFTABLE>
```

---

## Generated Airflow DAG Example

```python
"""
Auto-generated Airflow DAG from Control-M
Generated by OFlair
DAG: batch_folder_dag
"""

from datetime import datetime, timedelta
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='batch_folder_dag',
    default_args=default_args,
    description='Migrated from Control-M: BATCH_FOLDER',
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['control-m-migration'],
) as dag:

    job_001 = BashOperator(
        task_id='job_001',
        bash_command='python /scripts/etl.py',
        env={'ENV': 'production'},
    )

    # Dependencies
    job_000 >> job_001
```
