import { create } from 'zustand';
import type { ControlMDefinition, ControlMJob } from '@/types/controlm';
import type { GeneratedDAG } from '@/types/airflow';
import type { ConversionReport } from '@/lib/converter/report';
import type { DivideStrategy } from '@/lib/converter/dag-divider';

// Batch file input
export interface BatchFileInput {
  file: File;
  content: string;
  type: 'xml' | 'json';
  parsed?: ControlMDefinition;
  error?: string;
}

interface ConversionState {
  // Input state (single file - backwards compatible)
  inputFile: File | null;
  inputContent: string;
  inputType: 'xml' | 'json' | null;
  parsedDefinition: ControlMDefinition | null;

  // Batch input state
  batchFiles: BatchFileInput[];
  isBatchMode: boolean;

  // Selection
  selectedJobs: string[];

  // Output state
  generatedDags: GeneratedDAG[];
  conversionReport: ConversionReport | null;

  // Conversion options
  divideStrategy: DivideStrategy;

  // UI state
  isProcessing: boolean;
  error: string | null;
  step: 'upload' | 'select' | 'configure' | 'review' | 'result';

  // Actions
  setInputFile: (file: File | null) => void;
  setInputContent: (content: string) => void;
  setInputType: (type: 'xml' | 'json' | null) => void;
  setParsedDefinition: (definition: ControlMDefinition | null) => void;
  // Batch actions
  addBatchFiles: (files: BatchFileInput[]) => void;
  removeBatchFile: (index: number) => void;
  setBatchFileParsed: (index: number, parsed: ControlMDefinition) => void;
  setBatchFileError: (index: number, error: string) => void;
  clearBatchFiles: () => void;
  setIsBatchMode: (isBatch: boolean) => void;
  // Selection actions
  setSelectedJobs: (jobs: string[]) => void;
  toggleJobSelection: (jobName: string) => void;
  selectAllJobs: () => void;
  deselectAllJobs: () => void;
  setGeneratedDags: (dags: GeneratedDAG[]) => void;
  setConversionReport: (report: ConversionReport | null) => void;
  setDivideStrategy: (strategy: DivideStrategy) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setStep: (step: 'upload' | 'select' | 'configure' | 'review' | 'result') => void;
  reset: () => void;
  // Helpers
  getAllJobs: () => ControlMJob[];
}

const initialState = {
  inputFile: null,
  inputContent: '',
  inputType: null as 'xml' | 'json' | null,
  parsedDefinition: null,
  batchFiles: [] as BatchFileInput[],
  isBatchMode: false,
  selectedJobs: [] as string[],
  generatedDags: [] as GeneratedDAG[],
  conversionReport: null as ConversionReport | null,
  divideStrategy: 'folder' as DivideStrategy,
  isProcessing: false,
  error: null as string | null,
  step: 'upload' as const,
};

export const useConverterStore = create<ConversionState>((set, get) => ({
  ...initialState,

  setInputFile: (file) => set({ inputFile: file }),

  setInputContent: (content) => set({ inputContent: content }),

  setInputType: (type) => set({ inputType: type }),

  setParsedDefinition: (definition) => {
    const allJobs = definition?.jobs.map((j) => j.JOBNAME) ?? [];
    set({
      parsedDefinition: definition,
      selectedJobs: allJobs,
    });
  },

  // Batch file actions
  addBatchFiles: (files) => {
    const { batchFiles } = get();
    set({
      batchFiles: [...batchFiles, ...files],
      isBatchMode: true,
    });
  },

  removeBatchFile: (index) => {
    const { batchFiles } = get();
    const newFiles = batchFiles.filter((_, i) => i !== index);
    set({
      batchFiles: newFiles,
      isBatchMode: newFiles.length > 0,
    });
  },

  setBatchFileParsed: (index, parsed) => {
    const { batchFiles } = get();
    const newFiles = [...batchFiles];
    newFiles[index] = { ...newFiles[index], parsed };
    // Update selected jobs with all jobs from all parsed files
    const allJobs: string[] = [];
    for (const file of newFiles) {
      if (file.parsed) {
        allJobs.push(...file.parsed.jobs.map((j) => j.JOBNAME));
      }
    }
    set({ batchFiles: newFiles, selectedJobs: allJobs });
  },

  setBatchFileError: (index, error) => {
    const { batchFiles } = get();
    const newFiles = [...batchFiles];
    newFiles[index] = { ...newFiles[index], error };
    set({ batchFiles: newFiles });
  },

  clearBatchFiles: () => set({ batchFiles: [], isBatchMode: false }),

  setIsBatchMode: (isBatch) => set({ isBatchMode: isBatch }),

  setSelectedJobs: (jobs) => set({ selectedJobs: jobs }),

  toggleJobSelection: (jobName) => {
    const { selectedJobs } = get();
    if (selectedJobs.includes(jobName)) {
      set({ selectedJobs: selectedJobs.filter((j) => j !== jobName) });
    } else {
      set({ selectedJobs: [...selectedJobs, jobName] });
    }
  },

  selectAllJobs: () => {
    const { parsedDefinition } = get();
    const allJobs = parsedDefinition?.jobs.map((j) => j.JOBNAME) ?? [];
    set({ selectedJobs: allJobs });
  },

  deselectAllJobs: () => set({ selectedJobs: [] }),

  setGeneratedDags: (dags) => set({ generatedDags: dags }),

  setConversionReport: (report) => set({ conversionReport: report }),

  setDivideStrategy: (strategy) => set({ divideStrategy: strategy }),

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  setStep: (step) => set({ step }),

  reset: () => set(initialState),

  // Get all jobs from single file or batch files
  getAllJobs: () => {
    const { parsedDefinition, batchFiles, isBatchMode } = get();
    if (isBatchMode) {
      const allJobs: ControlMJob[] = [];
      for (const file of batchFiles) {
        if (file.parsed) {
          allJobs.push(...file.parsed.jobs);
        }
      }
      return allJobs;
    }
    return parsedDefinition?.jobs ?? [];
  },
}));
