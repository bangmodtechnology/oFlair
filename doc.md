# OFlair - Control-M to Airflow Converter

OFlair is a specialized tool designed to facilitate the migration of batch job definitions from BMC Control-M to Apache Airflow. It parses Control-M XML exports and generates equivalent Airflow DAG (Directed Acyclic Graph) Python code, supporting modern Airflow standards.

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4
- **Components:** Radix UI (primitives), Lucide React (icons)
- **State Management:** Zustand
- **Forms & Validation:** React Hook Form, Zod

### Backend
- **Runtime:** Node.js (via Next.js API Routes)
- **Database ORM:** Prisma
- **Database:** SQLite (dev)
- **Templating:** Handlebars
- **XML Parsing:** fast-xml-parser

## Project Structure

```
/src
  /app           # Next.js App Router pages and API endpoints
  /components    # React components (UI, Converter-specific, Shared)
  /lib
    /generator   # Logic for generating Airflow Python code
    /parser      # Logic for parsing Control-M XML/JSON
    /templates   # Handlebars templates
    prisma.ts    # Database client instance
  /store         # Zustand state stores
  /types         # TypeScript definitions (Airflow, Control-M, Templates)
/prisma          # Database schema and migrations
```

## Core Functionality

### 1. Control-M Parsing
Located in `src/lib/parser/xml-parser.ts`, the parser handles various Control-M XML export structures:
- **Folders:** Standard `FOLDER` and newer `SMART_FOLDER` structures.
- **Jobs:** Extracts job definitions including `JOBNAME`, `CMDLINE`, `host`, `run_as`, and scheduling details.
- **Conditions:** Parses `INCOND` and `OUTCOND` for dependency resolution.

### 2. Airflow DAG Generation
Located in `src/lib/generator/dag-generator.ts`, the generator produces Python code using Handlebars templates.
- **Version Support:**
  - **Airflow 2.x:** Standard `with DAG(...)` context manager style.
  - **Airflow 3.x:** Supports the new standard provider packages.
  - **TaskFlow API:** Optional generation using the `@task` and `@dag` decorators.
- **Operator Mapping:**
  - `Command/OS` -> `BashOperator`
  - `FileWatcher` -> `FileSensor`
  - `Script/Python` -> `PythonOperator` (or `BashOperator` depending on file extension)
  - `Dummy/Box` -> `EmptyOperator`

### 3. Dependency Resolution
The system automatically builds DAG dependencies (`>>`) by matching Control-M `INCOND` (Input Conditions) with `OUTCOND` (Output Conditions) from other jobs within the same parsing context.

## Database Schema

The application uses SQLite with the following core models:

- **Template:** Stores custom conversion rules, matching conditions, and Handlebars templates for output customization.
- **Conversion:** Tracks conversion jobs, storing input content (XML), output content (Python), status, and statistics (job/dag counts).
- **Setting:** Stores application-wide configuration.

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Initialize Database:**
   ```bash
   npx prisma migrate dev
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

4. **Access the Application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.
