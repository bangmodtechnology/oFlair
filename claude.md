# Control-M to Airflow Converter (OFlair)

## 📋 Project Overview

โปรเจคสำหรับแปลง Control-M Job Definitions ไปเป็น Apache Airflow DAGs โดยมี GUI ที่ใช้งานง่าย รองรับระบบ Template และสามารถ customize ได้

---

## 🎯 Requirements

| ความต้องการ | รายละเอียด |
|------------|-----------|
| GUI สวยงาม | Web-based หรือ Desktop App ที่ modern และ responsive |
| ใช้งานง่าย | Drag & Drop, Visual Editor, Intuitive UX |
| ระบบ Template | สร้าง/บันทึก template, กำหนดเงื่อนไข mapping |
| พัฒนาต่อง่าย | โค้ดเข้าใจง่าย, มี documentation, modular architecture |

---

## 🔬 Framework Analysis

### Web-based Options

#### 1. Next.js + React + Tailwind + Shadcn/ui ⭐ **แนะนำ**

| หมวด | รายละเอียด |
|------|-----------|
| **Pros** | - UI Components สวยงาม modern (Shadcn/ui) |
| | - App Router + Server Actions จัดการ backend ง่าย |
| | - Ecosystem ใหญ่ มี library เยอะ |
| | - Deploy ได้หลายรูปแบบ (Vercel, Docker, Self-hosted) |
| | - TypeScript support ดีเยี่ยม |
| **Cons** | - Learning curve สูงกว่า Vue/Svelte เล็กน้อย |
| **เหมาะกับ** | Production-grade app, Team development |

#### 2. Vue 3 + Nuxt 3 + Tailwind + PrimeVue

| หมวด | รายละเอียด |
|------|-----------|
| **Pros** | - Template syntax อ่านง่าย |
| | - Learning curve ต่ำ |
| | - PrimeVue มี components ครบครัน |
| **Cons** | - Community เล็กกว่า React |
| **เหมาะกับ** | Small-Medium team, Rapid development |

#### 3. Svelte + SvelteKit + Skeleton UI

| หมวด | รายละเอียด |
|------|-----------|
| **Pros** | - เรียนรู้ง่ายที่สุด, Boilerplate น้อย |
| | - Performance ดีมาก |
| | - Reactive โดยไม่ต้องใช้ virtual DOM |
| **Cons** | - Ecosystem เล็กกว่า |
| **เหมาะกับ** | Solo developer, Simple apps |

### Desktop Options

#### 4. Tauri + React/Vue + Shadcn/ui

| หมวด | รายละเอียด |
|------|-----------|
| **Pros** | - เบามาก (~10MB vs Electron ~150MB) |
| | - Rust backend = Performance + Security |
| | - Access local files ได้ง่าย |
| | - Cross-platform (Windows, macOS, Linux) |
| **Cons** | - ต้องรู้ Rust บ้างสำหรับ custom backend |
| **เหมาะกับ** | Desktop-first app, File-heavy operations |

#### 5. Electron + React + Tailwind

| หมวด | รายละเอียด |
|------|-----------|
| **Pros** | - Mature ecosystem |
| | - Full Node.js access |
| | - ใช้ web tech ล้วนๆ |
| **Cons** | - หนักมาก (RAM, Disk space) |
| **เหมาะกับ** | Complex desktop apps |

---

## ✅ Recommended Stack

### Primary Choice: **Web-based**

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
├─────────────────────────────────────────────────────┤
│  Framework    : Next.js 14+ (App Router)            │
│  Language     : TypeScript                          │
│  UI Library   : Shadcn/ui + Radix UI                │
│  Styling      : Tailwind CSS                        │
│  State        : Zustand / Jotai                     │
│  Forms        : React Hook Form + Zod              │
│  Editor       : Monaco Editor (for code preview)    │
│  Flow Editor  : React Flow (for DAG visualization)  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    BACKEND                          │
├─────────────────────────────────────────────────────┤
│  API          : Next.js API Routes / Server Actions │
│  Validation   : Zod                                 │
│  Parser       : Custom XML/JSON parser              │
│  Template     : Handlebars / EJS                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   STORAGE                           │
├─────────────────────────────────────────────────────┤
│  Database     : SQLite (local) / PostgreSQL (prod)  │
│  ORM          : Prisma / Drizzle                    │
│  File Storage : Local filesystem / S3               │
└─────────────────────────────────────────────────────┘
```

### Alternative Choice: **Desktop App (Tauri)**

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
├─────────────────────────────────────────────────────┤
│  Framework    : Tauri + React/Vite                  │
│  Language     : TypeScript                          │
│  UI Library   : Shadcn/ui                           │
│  Styling      : Tailwind CSS                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    BACKEND                          │
├─────────────────────────────────────────────────────┤
│  Runtime      : Rust (Tauri core)                   │
│  Commands     : Tauri Commands (Rust → JS bridge)   │
│  Parser       : serde_json / quick-xml              │
└─────────────────────────────────────────────────────┘
```

---

## 🏗️ Project Structure (Next.js)

```
oflair/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # Dashboard routes
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── convert/          # Conversion page
│   │   │   ├── templates/        # Template management
│   │   │   └── settings/         # Settings page
│   │   ├── api/                  # API routes
│   │   │   ├── convert/          # Conversion API
│   │   │   ├── templates/        # Template CRUD API
│   │   │   └── export/           # Export API
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui components
│   │   ├── converter/            # Converter components
│   │   │   ├── FileUploader.tsx
│   │   │   ├── JobPreview.tsx
│   │   │   ├── DagEditor.tsx
│   │   │   └── OutputViewer.tsx
│   │   ├── templates/            # Template components
│   │   │   ├── TemplateList.tsx
│   │   │   ├── TemplateEditor.tsx
│   │   │   └── ConditionBuilder.tsx
│   │   └── shared/               # Shared components
│   │
│   ├── lib/
│   │   ├── parser/               # Control-M parsers
│   │   │   ├── xml-parser.ts
│   │   │   ├── json-parser.ts
│   │   │   └── job-normalizer.ts
│   │   ├── converter/            # Main converter engine (dagify-inspired)
│   │   │   ├── index.ts          # Main entry point
│   │   │   ├── rules.ts          # Transformation rules
│   │   │   ├── dag-divider.ts    # DAG splitting strategies
│   │   │   ├── schedule-converter.ts  # Cron conversion
│   │   │   ├── report.ts         # Conversion report
│   │   │   └── export.ts         # Export utilities
│   │   ├── generator/            # Airflow generators
│   │   │   ├── dag-generator.ts
│   │   │   ├── task-generator.ts
│   │   │   └── template-engine.ts
│   │   ├── templates/            # Default templates
│   │   │   ├── bash-operator.hbs
│   │   │   ├── python-operator.hbs
│   │   │   └── sensor-operator.hbs
│   │   ├── storage/              # Local storage
│   │   │   └── config-storage.ts # localStorage wrapper
│   │   └── utils/                # Utilities
│   │
│   ├── store/                    # State management
│   │   ├── converter-store.ts
│   │   └── template-store.ts
│   │
│   └── types/                    # TypeScript types
│       ├── controlm.ts
│       ├── airflow.ts
│       └── template.ts
│
├── prisma/
│   └── schema.prisma             # Database schema
│
├── public/
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## 🎨 UI Features

### 1. Dashboard
- Overview ของ conversions ที่ผ่านมา
- Quick actions (New conversion, Import template)
- Statistics และ recent activity

### 2. Converter Page
```
┌────────────────────────────────────────────────────────────┐
│  [Upload Control-M File]  [Select Template ▼]  [Convert]   │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                 │
│   Control-M Jobs         │   Generated Airflow DAG         │
│   (Tree View)            │   (Code Editor + Preview)       │
│                          │                                 │
│   📁 FOLDER-001          │   from airflow import DAG       │
│   ├── 📄 JOB-001         │   from airflow.operators...     │
│   ├── 📄 JOB-002         │                                 │
│   └── 📄 JOB-003         │   with DAG(...) as dag:         │
│                          │       task1 = BashOperator(...) │
│                          │                                 │
├──────────────────────────┴─────────────────────────────────┤
│  [Dependency Graph View]  [Mapping Details]  [Logs]        │
└────────────────────────────────────────────────────────────┘
```

### 3. Template Management
- Visual template editor
- Condition builder (drag & drop)
- Variable mapping configuration
- Import/Export templates

### 4. Settings
- Default configurations
- Airflow connection settings
- Output format preferences

---

## 📐 Template System Design

### Template Structure
```typescript
interface ConversionTemplate {
  id: string;
  name: string;
  description: string;

  // Matching conditions
  conditions: Condition[];

  // Mapping rules
  mappings: MappingRule[];

  // Output template (Handlebars)
  outputTemplate: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface Condition {
  field: string;           // e.g., "jobType", "application", "command"
  operator: 'equals' | 'contains' | 'regex' | 'startsWith';
  value: string;
}

interface MappingRule {
  source: string;          // Control-M field
  target: string;          // Airflow field
  transform?: string;      // Optional transformation function
  defaultValue?: string;
}
```

### Example Template
```yaml
name: "Command Job to BashOperator"
conditions:
  - field: "jobType"
    operator: "equals"
    value: "Command"

mappings:
  - source: "JOBNAME"
    target: "task_id"
    transform: "lowercase"
  - source: "CMDLINE"
    target: "bash_command"
  - source: "RUN_AS"
    target: "env.USER"

outputTemplate: |
  {{task_id}} = BashOperator(
      task_id='{{task_id}}',
      bash_command='{{bash_command}}',
      {{#if env}}
      env={{env}},
      {{/if}}
      dag=dag
  )
```

---

## 🔄 Conversion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│   Parse     │────▶│   Match     │────▶│  Generate   │
│  XML/JSON   │     │  Control-M  │     │  Templates  │     │  Airflow    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │ Normalized  │     │  Applied    │     │  DAG Files  │
                    │ Job Objects │     │  Mappings   │     │  + Preview  │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 🛠️ Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Setup Next.js project with TypeScript
- [ ] Configure Tailwind + Shadcn/ui
- [ ] Create basic layout and navigation
- [ ] Setup database schema (Prisma)

### Phase 2: Parser (Week 3-4)
- [ ] Implement Control-M XML parser
- [ ] Implement Control-M JSON parser
- [ ] Create job normalizer
- [ ] Unit tests for parsers

### Phase 3: Template System (Week 5-6)
- [ ] Design template schema
- [ ] Build template editor UI
- [ ] Implement condition builder
- [ ] Create default templates

### Phase 4: Generator (Week 7-8)
- [ ] Implement DAG generator
- [ ] Build template engine
- [ ] Create output viewer
- [ ] Handle dependencies/edges

### Phase 5: Polish (Week 9-10)
- [ ] Add visualization (React Flow)
- [ ] Implement import/export
- [ ] Error handling & validation
- [ ] Documentation

---

## 🚀 Quick Start Commands

```bash
# Create Next.js project
npx create-next-app@latest oflair --typescript --tailwind --eslint --app

# Add Shadcn/ui
npx shadcn@latest init

# Add essential components
npx shadcn@latest add button card dialog form input select tabs toast

# Add other dependencies
npm install zustand zod react-hook-form @hookform/resolvers
npm install @monaco-editor/react reactflow
npm install handlebars fast-xml-parser
npm install jszip file-saver
npm install sonner  # Toast notifications

# Dev dependencies
npm install -D @types/node
```

---

## 📚 Key Libraries

| Library | Purpose | Link |
|---------|---------|------|
| Next.js 14 | React framework | https://nextjs.org |
| Shadcn/ui | UI components | https://ui.shadcn.com |
| Tailwind CSS | Styling | https://tailwindcss.com |
| Zustand | State management | https://zustand-demo.pmnd.rs |
| React Hook Form | Form handling | https://react-hook-form.com |
| Zod | Validation | https://zod.dev |
| Monaco Editor | Code editor | https://microsoft.github.io/monaco-editor |
| React Flow | DAG visualization | https://reactflow.dev |
| Handlebars | Templating | https://handlebarsjs.com |
| fast-xml-parser | XML parsing | https://github.com/NaturalIntelligence/fast-xml-parser |
| JSZip | ZIP file generation | https://stuk.github.io/jszip |
| file-saver | File download utility | https://github.com/eligrey/FileSaver.js |

---

## 🎯 Success Criteria

- [x] สามารถ upload Control-M XML/JSON และแปลงเป็น Airflow DAG ได้
- [x] UI ใช้งานง่าย ไม่ต้องอ่าน documentation มาก
- [x] สามารถสร้าง/แก้ไข/บันทึก templates ได้
- [x] แสดง dependency graph ได้อย่างถูกต้อง
- [x] Export เป็น .py files พร้อมใช้งานได้เลย
- [x] โค้ดมี structure ชัดเจน พัฒนาต่อได้ง่าย

---

## 📝 Notes

- ใช้ TypeScript เพื่อ type safety และ developer experience ที่ดี
- เริ่มจาก Web-based ก่อน ถ้าต้องการ Desktop สามารถ wrap ด้วย Tauri ภายหลังได้
- ให้ความสำคัญกับ UX - ผู้ใช้ไม่ควรต้องเรียนรู้มากก่อนใช้งานได้
- Template system ควร flexible พอที่จะรองรับ job types ต่างๆ ของ Control-M

---

## 🔧 แก้ไข และ เพิ่มเติมฟังก์ชั่น

### Pending Tasks
(No pending tasks)

### Completed
- [x] ลบ snake_case ออกทั้งหมด
- [x] Save Config โดยใช้ localStorage แทน Database (ไฟล์: `src/lib/storage/config-storage.ts`)
- [x] แยก template เป็นไฟล์ YAML (โฟลเดอร์: `templates/`)
- [x] รองรับ `<VARIABLE>` tag ใน XML parser และ convert เป็น env_vars
- [x] สร้าง template ครบตาม Operator พื้นฐาน (8 templates)
- [x] เพิ่ม Operator ใหม่:
  - KubernetesPodOperator
  - WasbBlobSensor (Azure)
  - SSHOperator
  - EmailOperator
- [x] เพิ่มส่วน Preview DAG หลัง Convert (OutputViewer component)
- [x] เพิ่มเมนู Conversion History (`/history` page)
- [x] **New Converter Engine** (dagify-inspired):
  - Rules Engine สำหรับ transformation (`src/lib/converter/rules.ts`)
  - DAG Divider สำหรับแบ่ง jobs เป็นหลาย DAGs (`src/lib/converter/dag-divider.ts`)
  - Schedule Converter แปลง Control-M scheduling เป็น cron (`src/lib/converter/schedule-converter.ts`)
  - Conversion Report พร้อม warnings และ statistics (`src/lib/converter/report.ts`)
  - Bulk Export เป็น ZIP พร้อม README.md และ requirements.txt (`src/lib/converter/export.ts`)
  - รองรับ Airflow 2.5 - 3.1 พร้อม TaskFlow API
- [x] **Dependency Graph Visualization** (React Flow):
  - Interactive DAG visualization แสดง tasks และ dependencies
  - Color-coded nodes ตาม operator type
  - Auto-layout ตาม dependency hierarchy
  - MiniMap และ Controls สำหรับ navigation
  - Toggle ระหว่าง Code view และ Graph view

---

## 🔄 Converter Engine Architecture

### Overview
Engine ใหม่ได้รับแรงบันดาลใจจาก [Google Cloud Platform dagify](https://github.com/GoogleCloudPlatform/dagify)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Parse     │────▶│   Rules     │────▶│   Divide    │────▶│  Generate   │
│  Control-M  │     │  Transform  │     │   DAGs      │     │   Code      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  Normalize  │     │  Schedule   │     │   Report    │
                    │  Job Data   │     │  Convert    │     │  Generate   │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

### 1. Rules Engine (`src/lib/converter/rules.ts`)

Transformation functions สำหรับแปลงค่าต่างๆ:

| Function | Description | Example |
|----------|-------------|---------|
| `lowercase` | แปลงเป็นตัวพิมพ์เล็ก | `JOB_NAME` → `job_name` |
| `uppercase` | แปลงเป็นตัวพิมพ์ใหญ่ | `job_name` → `JOB_NAME` |
| `python_variable_safe` | ทำให้เป็น Python variable ที่ถูกต้อง | `my-job` → `my_job` |
| `escape_quotes` | escape quotes สำหรับ string | `it's` → `it\'s` |
| `prefix:xxx` | เพิ่ม prefix | `task` → `xxx_task` |
| `suffix:xxx` | เพิ่ม suffix | `task` → `task_xxx` |
| `replace:old:new` | แทนที่ข้อความ | custom replacement |
| `trim` | ตัด whitespace | ` text ` → `text` |
| `default:xxx` | ค่า default ถ้าว่าง | empty → `xxx` |
| `lookup:key` | ค้นหาค่าจาก mapping | lookup จาก dictionary |

### 2. DAG Divider (`src/lib/converter/dag-divider.ts`)

Strategies สำหรับแบ่ง jobs เป็นหลาย DAGs:

| Strategy | Description |
|----------|-------------|
| `folder` | แบ่งตาม PARENT_FOLDER (default) |
| `application` | แบ่งตาม APPLICATION field |
| `sub_application` | แบ่งตาม SUB_APPLICATION field |
| `single` | รวมทุก jobs เป็น DAG เดียว |
| `custom` | กำหนด custom grouping function |

Options:
- `maxJobsPerDag`: จำกัดจำนวน jobs ต่อ DAG (auto-split ถ้าเกิน)
- `preserveDependencies`: รักษา dependencies ข้าม DAGs

### 3. Schedule Converter (`src/lib/converter/schedule-converter.ts`)

แปลง Control-M scheduling เป็น Airflow cron expressions:

```typescript
// Control-M fields ที่รองรับ:
// - DAYS: วันในสัปดาห์ (SUN, MON, TUE, ...)
// - TIME: เวลาที่รัน (HHMM format)
// - INTERVAL: ความถี่ (minutes)
// - MONTHS: เดือนที่รัน

// Example:
// DAYS="MON,WED,FRI" + TIME="0930"
// → "30 9 * * 1,3,5"
```

Functions:
- `convertSchedule(job)` - แปลงเป็น cron expression
- `cronToHuman(cron)` - แปลงเป็นข้อความอ่านง่าย
- `validateCron(cron)` - ตรวจสอบ cron validity

### 4. Conversion Report (`src/lib/converter/report.ts`)

รายงานผลการ conversion:

```typescript
interface ConversionReport {
  summary: {
    totalJobs: number;
    convertedJobs: number;
    failedJobs: number;
    dagsGenerated: number;
    conversionRate: number;
  };
  jobTypes: { type: string; count: number }[];
  operatorUsage: { operator: string; count: number }[];
  warnings: Warning[];
  manualReviewItems: ManualReviewItem[];
  dependencyStats: {
    totalDependencies: number;
    crossDagDependencies: number;
    circularDependencies: string[][];
  };
}
```

Export formats:
- `formatReportAsText()` - Plain text report
- `formatReportAsJson()` - JSON format

### 5. Export Utilities (`src/lib/converter/export.ts`)

Functions สำหรับ export:

| Function | Description |
|----------|-------------|
| `downloadFile(content, filename)` | Download single file |
| `downloadDag(dag)` | Download single DAG |
| `downloadAllAsZip(dags, report, options)` | Download all as ZIP |
| `copyToClipboard(content)` | Copy to clipboard |

ZIP contents:
```
conversion_output.zip
├── dags/
│   ├── dag_1.py
│   ├── dag_2.py
│   └── ...
├── README.md          # Conversion summary
└── requirements.txt   # Python dependencies
```

### 6. Airflow Version Support

รองรับ Airflow versions:
- **2.5.x** - 2.10.x: Classic import paths
- **3.0.x** - 3.1.x: New import paths (`airflow.providers.standard`, `airflow.sdk`)

Options:
- `useTaskFlowApi`: ใช้ @dag decorator (Airflow 3.x only)
- `includeComments`: เพิ่ม comments อธิบายใน code

### Usage Example

```typescript
import { convertControlMToAirflow } from '@/lib/converter';

const result = await convertControlMToAirflow(jobs, {
  airflowVersion: '3.1',
  useTaskFlowApi: true,
  divideStrategy: { strategy: 'folder' },
  includeComments: true,
});

// result.dags - Generated DAGs
// result.report - Conversion report with warnings
```

---

## 📊 Dependency Graph Visualization

### Overview
ใช้ React Flow (@xyflow/react) สำหรับแสดง DAG visualization แบบ interactive

### Features

| Feature | Description |
|---------|-------------|
| **Auto Layout** | จัดเรียง nodes อัตโนมัติตาม dependency hierarchy |
| **Color-coded Nodes** | แต่ละ operator type มีสีเฉพาะ |
| **Interactive** | Drag, zoom, pan ได้ |
| **MiniMap** | แสดง overview ของ DAG ทั้งหมด |
| **Info Panel** | แสดงสถิติ tasks และ dependencies |

### Operator Colors

| Operator | Color |
|----------|-------|
| BashOperator | Orange |
| PythonOperator | Blue |
| EmptyOperator | Gray |
| FileSensor | Purple |
| SQLExecuteQueryOperator | Green |
| KubernetesPodOperator | Blue |
| SSHOperator | Slate |
| EmailOperator | Red |

### Component Usage

```tsx
import { DependencyGraph } from '@/components/converter/dependency-graph';

<DependencyGraph dag={generatedDag.dag} />
```

### Toggle View

ใน OutputViewer สามารถสลับระหว่าง:
- **Code View** - แสดง Python code ด้วย Monaco Editor
- **Graph View** - แสดง Dependency Graph ด้วย React Flow