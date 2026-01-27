import { create } from 'zustand';
import type { ControlMDefinition, ControlMJob } from '@/types/controlm';
import type { GeneratedDAG } from '@/types/airflow';

interface ConversionState {
  // Input state
  inputFile: File | null;
  inputContent: string;
  inputType: 'xml' | 'json' | null;
  parsedDefinition: ControlMDefinition | null;

  // Selection
  selectedJobs: string[];

  // Output state
  generatedDags: GeneratedDAG[];

  // UI state
  isProcessing: boolean;
  error: string | null;
  step: 'upload' | 'preview' | 'convert' | 'result';

  // Actions
  setInputFile: (file: File | null) => void;
  setInputContent: (content: string) => void;
  setInputType: (type: 'xml' | 'json' | null) => void;
  setParsedDefinition: (definition: ControlMDefinition | null) => void;
  setSelectedJobs: (jobs: string[]) => void;
  toggleJobSelection: (jobName: string) => void;
  selectAllJobs: () => void;
  deselectAllJobs: () => void;
  setGeneratedDags: (dags: GeneratedDAG[]) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  setStep: (step: 'upload' | 'preview' | 'convert' | 'result') => void;
  reset: () => void;
}

const initialState = {
  inputFile: null,
  inputContent: '',
  inputType: null as 'xml' | 'json' | null,
  parsedDefinition: null,
  selectedJobs: [] as string[],
  generatedDags: [] as GeneratedDAG[],
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

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  setStep: (step) => set({ step }),

  reset: () => set(initialState),
}));
