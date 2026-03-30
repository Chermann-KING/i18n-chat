import { create } from 'zustand';

/** Wizard steps in order. */
export type WizardStep = 'template' | 'variables' | 'recipients' | 'review';

/** State and actions for the dispatch wizard. */
interface DispatchWizardState {
  step: WizardStep;
  selectedTemplateId: string;
  variables: Record<string, string>;
  selectedRecipientIds: string[];
  recipientSearch: string;
  /** Channels to use for this dispatch (at least one required by the API). */
  selectedChannels: string[];

  setStep: (step: WizardStep) => void;
  setSelectedTemplateId: (id: string) => void;
  setVariables: (vars: Record<string, string>) => void;
  setSelectedRecipientIds: (ids: string[]) => void;
  setRecipientSearch: (q: string) => void;
  setSelectedChannels: (channels: string[]) => void;
  /** Resets the wizard to its initial state (called after a successful send). */
  reset: () => void;
}

const INITIAL_STATE = {
  step: 'template' as WizardStep,
  selectedTemplateId: '',
  variables: {},
  selectedRecipientIds: [],
  recipientSearch: '',
  selectedChannels: ['EMAIL'],
};

/**
 * Global store for the dispatch wizard.
 *
 * Lives outside the React component tree so that locale switches
 * (which unmount and remount the page) do not reset the wizard state.
 */
export const useDispatchWizardStore = create<DispatchWizardState>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step }),
  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),
  setVariables: (variables) => set({ variables }),
  setSelectedRecipientIds: (selectedRecipientIds) => set({ selectedRecipientIds }),
  setRecipientSearch: (recipientSearch) => set({ recipientSearch }),
  setSelectedChannels: (selectedChannels) => set({ selectedChannels }),
  reset: () => set(INITIAL_STATE),
}));
