'use client';

export type SimulationWorkspaceState = {
  scenarioTitle: string;
  activePane: 'timeline' | 'decisions' | 'communications';
  phaseLabel: string;
  currentStep: string;
  elapsedSeconds: number;
  facilitatorNotes: string;
  publicMessageDraft: string;
  selectedDecision: string | null;
  selectedTags: string[];
  eventLog: string[];
  checklist: {
    authoritiesAlerted: boolean;
    legalReviewed: boolean;
    executiveBriefed: boolean;
    pressHoldingReady: boolean;
  };
};

export type StoredSimulationSession = {
  state: SimulationWorkspaceState;
  updatedAt: string;
};

export const SIMULATION_SESSION_KEY = 'default';
const STORAGE_PREFIX = 'crise-kitty-simulation-session:';

export function createDefaultSimulationState(): SimulationWorkspaceState {
  return {
    scenarioTitle: 'Incident cyber sur infrastructure critique',
    activePane: 'timeline',
    phaseLabel: 'Qualification',
    currentStep: 'Analyser l impact initial et confirmer la portée',
    elapsedSeconds: 0,
    facilitatorNotes: '',
    publicMessageDraft: '',
    selectedDecision: null,
    selectedTags: ['cyber', 'cellule-de-crise'],
    eventLog: [
      '08:32 - Alerte SOC reçue',
      '08:36 - Escalade au responsable de crise',
    ],
    checklist: {
      authoritiesAlerted: false,
      legalReviewed: false,
      executiveBriefed: false,
      pressHoldingReady: false,
    },
  };
}

export function getSimulationStorageKey(sessionKey = SIMULATION_SESSION_KEY) {
  return `${STORAGE_PREFIX}${sessionKey}`;
}

export function readStoredSimulationSession(sessionKey = SIMULATION_SESSION_KEY) {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(getSimulationStorageKey(sessionKey));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSimulationSession;
  } catch {
    return null;
  }
}

export function writeStoredSimulationSession(
  state: SimulationWorkspaceState,
  sessionKey = SIMULATION_SESSION_KEY,
) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: StoredSimulationSession = {
    state,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    getSimulationStorageKey(sessionKey),
    JSON.stringify(payload),
  );

  return payload;
}
