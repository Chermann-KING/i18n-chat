import { create } from 'zustand';

interface TemplatesState {
  /** ID of the template currently open in the detail view, or null if showing the list. */
  selectedId: string | null;
  /** Open the detail view for the given template. */
  openTemplate: (id: string) => void;
  /** Return to the list view. */
  closeTemplate: () => void;
}

/**
 * Global store for the templates view.
 * Lives outside the React tree so the selected template survives locale changes.
 */
export const useTemplatesStore = create<TemplatesState>((set) => ({
  selectedId: null,
  openTemplate: (id) => set({ selectedId: id }),
  closeTemplate: () => set({ selectedId: null }),
}));
