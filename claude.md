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
│   │   ├── generator/            # Airflow generators
│   │   │   ├── dag-generator.ts
│   │   │   ├── task-generator.ts
│   │   │   └── template-engine.ts
│   │   ├── templates/            # Default templates
│   │   │   ├── bash-operator.hbs
│   │   │   ├── python-operator.hbs
│   │   │   └── sensor-operator.hbs
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
    transform: "snake_case"
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
npm install prisma @prisma/client
npm install handlebars fast-xml-parser

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
| Prisma | Database ORM | https://prisma.io |
| Handlebars | Templating | https://handlebarsjs.com |
| fast-xml-parser | XML parsing | https://github.com/NaturalIntelligence/fast-xml-parser |

---

## 🎯 Success Criteria

- [ ] สามารถ upload Control-M XML/JSON และแปลงเป็น Airflow DAG ได้
- [ ] UI ใช้งานง่าย ไม่ต้องอ่าน documentation มาก
- [ ] สามารถสร้าง/แก้ไข/บันทึก templates ได้
- [ ] แสดง dependency graph ได้อย่างถูกต้อง
- [ ] Export เป็น .py files พร้อมใช้งานได้เลย
- [ ] โค้ดมี structure ชัดเจน พัฒนาต่อได้ง่าย

---

## 📝 Notes

- ใช้ TypeScript เพื่อ type safety และ developer experience ที่ดี
- เริ่มจาก Web-based ก่อน ถ้าต้องการ Desktop สามารถ wrap ด้วย Tauri ภายหลังได้
- ให้ความสำคัญกับ UX - ผู้ใช้ไม่ควรต้องเรียนรู้มากก่อนใช้งานได้
- Template system ควร flexible พอที่จะรองรับ job types ต่างๆ ของ Control-M

# แก้ไข และ เพิ่มเติมฟังก์ชั่น
- [ ] ตอนนี้ไม่สามารถเชื่อมต่อ Database ได้ ทำให้ Save Config สำหรับการตั้งค่าต่างๆ
- [ ] แยก template ออกมาจาก database แล้วเก็บเป็นไฟล์ yaml แทน
- [ ] ตรวจสอบและจัดทำ mapping condition ใหม่ทั้งหมด แล้วทำให่รองรับ tag <VARIABLE> ที่อยู่ภายใต้ <JOB> ให้สามารถ convert ได้ด้วย
- [ ] สร้างตัวอย่าง template ใหม่ให้ครบตาม Operator พื้นฐาน
- [ ] เพิ่ม Operator ดังนี้
  - kubePodOperator
  - BlobOperator
- [ ] เพิ่มส่วนของการ Preview Dag หลัง Convert เสร็จเพื่อจะได้ ไม่ต้อง save dag ออกมาอ่าน
- [ ] เพิ่มเมนูส่วนของการดูว่า Convert job ไหนไปแล้วบ้าง แล้ว Convert เป็น Dag อะไร
- [ ] ลบ snake_case ออกทั้งหมด 