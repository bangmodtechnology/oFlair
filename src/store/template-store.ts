import { create } from 'zustand';
import type { ConversionTemplate, TemplateFormData } from '@/types/template';

interface TemplateState {
  templates: ConversionTemplate[];
  selectedTemplate: ConversionTemplate | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTemplates: (templates: ConversionTemplate[]) => void;
  addTemplate: (template: ConversionTemplate) => void;
  updateTemplate: (id: string, data: Partial<ConversionTemplate>) => void;
  deleteTemplate: (id: string) => void;
  setSelectedTemplate: (template: ConversionTemplate | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,

  setTemplates: (templates) => set({ templates }),

  addTemplate: (template) =>
    set((state) => ({
      templates: [...state.templates, template],
    })),

  updateTemplate: (id, data) =>
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date() } : t
      ),
    })),

  deleteTemplate: (id) =>
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
      selectedTemplate:
        state.selectedTemplate?.id === id ? null : state.selectedTemplate,
    })),

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
