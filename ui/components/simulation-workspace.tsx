'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '../lib/api';
import { getToken } from '../lib/auth';
import {
  createDefaultSimulationState,
  readStoredSimulationSession,
  SIMULATION_SESSION_KEY,
  type SimulationWorkspaceState,
  writeStoredSimulationSession,
} from '../lib/simulation-session';

type PersistedSimulationSession = {
  id: string;
  sessionKey: string;
  routePath: string;
  state: SimulationWorkspaceState;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastClientSavedAt: string | null;
};

type PersistedSimulationResponse = {
  session: PersistedSimulationSession | null;
};

const decisionOptions = [
  'Isoler la zone touchée immédiatement',
  'Basculer en mode dégradé contrôlé',
  'Communiquer d abord aux équipes internes',
];

const tagOptions = [
  'cyber',
  'juridique',
  'communication',
  'production',
  'direction',
  'prestataire',
];

export function SimulationWorkspace() {
  const [state, setState] = useState<SimulationWorkspaceState>(
    createDefaultSimulationState(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'restored-local' | 'restored-server' | 'saving' | 'saved'
  >('idle');
  const lastHydratedAtRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => ({
        ...current,
        elapsedSeconds: current.elapsedSeconds + 1,
      }));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Connecte-toi avant de reprendre une simulation.');
      setLoading(false);
      return;
    }

    const localSession = readStoredSimulationSession(SIMULATION_SESSION_KEY);

    void apiRequest<PersistedSimulationResponse>(
      `/simulation/session?key=${SIMULATION_SESSION_KEY}`,
      { token },
    )
      .then((payload) => {
        const remoteSession = payload.session;

        if (!remoteSession && localSession) {
          setState(localSession.state);
          setSyncStatus('restored-local');
          setNotice('État restauré depuis ce navigateur.');
          lastHydratedAtRef.current = localSession.updatedAt;
          return;
        }

        if (!remoteSession) {
          setNotice('Nouvelle simulation prête. Les changements seront sauvegardés automatiquement.');
          return;
        }

        const localUpdatedAt = localSession
          ? Date.parse(localSession.updatedAt)
          : Number.NEGATIVE_INFINITY;
        const remoteUpdatedAt = Date.parse(remoteSession.updatedAt);

        if (localSession && localUpdatedAt > remoteUpdatedAt) {
          setState(localSession.state);
          setSyncStatus('restored-local');
          setNotice('État restauré depuis ce navigateur, plus récent que la sauvegarde serveur.');
          lastHydratedAtRef.current = localSession.updatedAt;
          return;
        }

        setState(remoteSession.state);
        writeStoredSimulationSession(remoteSession.state, SIMULATION_SESSION_KEY);
        setSyncStatus('restored-server');
        setNotice('Simulation restaurée depuis la dernière sauvegarde serveur.');
        lastHydratedAtRef.current = remoteSession.updatedAt;
      })
      .catch((caughtError) => {
        if (localSession) {
          setState(localSession.state);
          setSyncStatus('restored-local');
          setNotice('Serveur indisponible, état restauré depuis ce navigateur.');
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Impossible de restaurer la session de simulation.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const localPayload = writeStoredSimulationSession(state, SIMULATION_SESSION_KEY);
    if (localPayload) {
      lastHydratedAtRef.current = localPayload.updatedAt;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    setSyncStatus('saving');
    const timeout = window.setTimeout(() => {
      void apiRequest<PersistedSimulationResponse>('/simulation/session', {
        method: 'PUT',
        token,
        body: {
          sessionKey: SIMULATION_SESSION_KEY,
          routePath: '/simulation',
          state,
          clientSavedAt: lastHydratedAtRef.current ?? new Date().toISOString(),
        },
      })
        .then(() => {
          setSyncStatus('saved');
        })
        .catch((caughtError) => {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Impossible de sauvegarder la session de simulation.',
          );
        });
    }, 700);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loading, state]);

  function updateChecklistItem(
    key: keyof SimulationWorkspaceState['checklist'],
    checked: boolean,
  ) {
    setState((current) => ({
      ...current,
      checklist: {
        ...current.checklist,
        [key]: checked,
      },
    }));
  }

  function updateEventLog(rawValue: string) {
    setState((current) => ({
      ...current,
      eventLog: rawValue
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 50),
    }));
  }

  function toggleTag(tag: string) {
    setState((current) => ({
      ...current,
      selectedTags: current.selectedTags.includes(tag)
        ? current.selectedTags.filter((entry) => entry !== tag)
        : [...current.selectedTags, tag].slice(0, 12),
    }));
  }

  return (
    <div className="profile-grid">
      <section className="panel profile-card">
        <span className="eyebrow">Simulation persistée</span>
        <h1>Reprise exacte de l interface.</h1>
        <p>
          Cette zone autosauvegarde le contexte de simulation dans le navigateur
          et côté serveur. En cas de fermeture accidentelle, l utilisateur
          retrouve le même écran, les mêmes notes, le même onglet et le même
          chronomètre logique.
        </p>

        {loading ? <div className="success">Restauration de la session...</div> : null}
        {error ? <div className="alert">{error}</div> : null}
        {notice ? <div className="success">{notice}</div> : null}

        <div className="profile-list">
          <div className="profile-row">
            <small>Synchronisation</small>
            <strong>{syncStatus}</strong>
          </div>
          <div className="profile-row">
            <small>Chronomètre logique</small>
            <strong>{state.elapsedSeconds}s</strong>
          </div>
          <div className="profile-row">
            <small>Onglet actif</small>
            <strong>{state.activePane}</strong>
          </div>
        </div>

        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="scenario-title">Titre de simulation</label>
          <input
            id="scenario-title"
            value={state.scenarioTitle}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                scenarioTitle: event.target.value,
              }));
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="phase-label">Phase courante</label>
          <input
            id="phase-label"
            value={state.phaseLabel}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                phaseLabel: event.target.value,
              }));
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="current-step">Étape courante</label>
          <input
            id="current-step"
            value={state.currentStep}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                currentStep: event.target.value,
              }));
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="active-pane">Vue active</label>
          <select
            id="active-pane"
            value={state.activePane}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                activePane: event.target.value as SimulationWorkspaceState['activePane'],
              }));
            }}
          >
            <option value="timeline">Timeline</option>
            <option value="decisions">Décisions</option>
            <option value="communications">Communications</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="facilitator-notes">Notes facilitateur</label>
          <textarea
            id="facilitator-notes"
            rows={8}
            value={state.facilitatorNotes}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                facilitatorNotes: event.target.value,
              }));
            }}
          />
        </div>
      </section>

      <aside className="aside-card">
        <span className="pill">État métier</span>
        <h2>Éléments restaurés</h2>

        <div className="inline-actions" style={{ marginBottom: '1rem' }}>
          {decisionOptions.map((decision) => (
            <button
              key={decision}
              className={
                state.selectedDecision === decision
                  ? 'button button-primary'
                  : 'button button-secondary'
              }
              type="button"
              onClick={() => {
                setState((current) => ({
                  ...current,
                  selectedDecision: decision,
                }));
              }}
            >
              {decision}
            </button>
          ))}
        </div>

        <div className="profile-list">
          {tagOptions.map((tag) => (
            <label className="profile-row checkbox-row" key={tag}>
              <input
                type="checkbox"
                checked={state.selectedTags.includes(tag)}
                onChange={() => {
                  toggleTag(tag);
                }}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>

        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="event-log">Journal d événements</label>
          <textarea
            id="event-log"
            rows={7}
            value={state.eventLog.join('\n')}
            onChange={(event) => {
              updateEventLog(event.target.value);
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="public-message">Message public</label>
          <textarea
            id="public-message"
            rows={5}
            value={state.publicMessageDraft}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                publicMessageDraft: event.target.value,
              }));
            }}
          />
        </div>

        <div className="profile-list">
          {(
            [
              ['authoritiesAlerted', 'Autorités alertées'],
              ['legalReviewed', 'Juridique relu'],
              ['executiveBriefed', 'Direction briefée'],
              ['pressHoldingReady', 'Holding statement prêt'],
            ] as const
          ).map(([key, label]) => (
            <label className="profile-row checkbox-row" key={key}>
              <input
                type="checkbox"
                checked={state.checklist[key]}
                onChange={(event) => {
                  updateChecklistItem(key, event.target.checked);
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="inline-actions" style={{ marginTop: '1rem' }}>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setState(createDefaultSimulationState());
              setNotice('État de simulation réinitialisé.');
            }}
          >
            Réinitialiser
          </button>
          <Link className="button button-primary" href="/profile">
            Retour profil
          </Link>
        </div>
      </aside>
    </div>
  );
}
