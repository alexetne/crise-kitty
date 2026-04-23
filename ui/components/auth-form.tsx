'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setToken } from '../lib/auth';
import { apiRequest } from '../lib/api';

type Mode = 'login' | 'register';

type AuthSuccess = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    status: 'active' | 'suspended' | 'disabled' | 'archived';
    createdAt: string;
    updatedAt: string;
  };
};

type MfaChallenge = {
  mfaRequired: true;
  mfaToken: string;
  methodType: 'totp_app' | 'email';
  expiresAt: string;
  deliveryPreview: {
    destination: string | null;
    code: string | null;
  } | null;
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isRegister = mode === 'register';

  async function finishLogin(payload: AuthSuccess) {
    setToken(payload.accessToken);
    setSuccess('Connexion réussie. Redirection vers ton profil.');
    router.push('/profile');
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      if (mfaChallenge) {
        const payload = await apiRequest<AuthSuccess>('/auth/login/mfa', {
          method: 'POST',
          body: {
            mfaToken: mfaChallenge.mfaToken,
            code: mfaCode,
          },
        });

        await finishLogin(payload);
        return;
      }

      const payload = await apiRequest<AuthSuccess | MfaChallenge>(
        isRegister ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: isRegister ? { name, email, password } : { email, password },
        },
      );

      if ('mfaRequired' in payload) {
        setMfaChallenge(payload);
        setSuccess(
          payload.methodType === 'email'
            ? 'Code email demandé. Saisis-le pour terminer la connexion.'
            : 'Code de ton application d authentification requis.',
        );
        return;
      }

      setToken(payload.accessToken);
      setSuccess(
        isRegister
          ? 'Compte créé. Redirection vers ton profil.'
          : 'Connexion réussie. Redirection vers ton profil.',
      );

      router.push('/profile');
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur inattendue est survenue.',
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="form-shell">
      <section className="form-card">
        <span className="eyebrow">
          {isRegister ? 'Nouvel espace' : 'Retour à bord'}
        </span>
        <h1>
          {mfaChallenge
            ? 'Valider le second facteur.'
            : isRegister
              ? 'Créer un compte.'
              : 'Se connecter.'}
        </h1>
        <p>
          {mfaChallenge
            ? 'La première étape est validée. Il reste à confirmer le code MFA.'
            : isRegister
              ? 'Ton compte est branché directement sur l API Fastify, avec option MFA ensuite.'
              : 'Entre tes identifiants et termine la connexion si un second facteur est actif.'}
        </p>

        <form onSubmit={handleSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          {success ? <div className="success">{success}</div> : null}

          {!mfaChallenge ? (
            <>
              {isRegister ? (
                <div className="field">
                  <label htmlFor="name">Nom</label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Alexandre Martin"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
              ) : null}

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Au moins 8 caractères"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </>
          ) : (
            <>
              <div className="profile-row" style={{ marginBottom: '1rem' }}>
                <small>Méthode requise</small>
                <strong>
                  {mfaChallenge.methodType === 'email'
                    ? 'Email'
                    : 'Application d authentification'}
                </strong>
              </div>

              {mfaChallenge.deliveryPreview?.destination ? (
                <div className="profile-row" style={{ marginBottom: '1rem' }}>
                  <small>Destination</small>
                  <strong>{mfaChallenge.deliveryPreview.destination}</strong>
                </div>
              ) : null}

              {mfaChallenge.deliveryPreview?.code ? (
                <div className="success">
                  Code de développement : <strong>{mfaChallenge.deliveryPreview.code}</strong>
                </div>
              ) : null}

              <div className="field">
                <label htmlFor="mfa-code">Code MFA</label>
                <input
                  id="mfa-code"
                  name="mfa-code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="inline-actions">
            <button className="button button-primary" type="submit" disabled={isPending}>
              {isPending
                ? 'Envoi...'
                : mfaChallenge
                  ? 'Valider le code'
                  : isRegister
                    ? 'Créer mon compte'
                    : 'Entrer dans l espace'}
            </button>
            <Link
              className="button button-secondary"
              href={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'J ai déjà un compte' : 'Créer un compte'}
            </Link>
          </div>
        </form>
      </section>

      <aside className="aside-card">
        <span className="pill">MFA prêt</span>
        <h2>Ce que cette UI fait réellement</h2>
        <p className="muted">
          Le login peut maintenant exiger un second facteur. Si le profil a activé
          TOTP ou email, la connexion passe automatiquement en challenge MFA.
        </p>
        <div className="profile-list">
          <div className="profile-row">
            <small>Étape 1</small>
            <strong>Mot de passe</strong>
          </div>
          <div className="profile-row">
            <small>Étape 2</small>
            <strong>Code MFA</strong>
          </div>
          <div className="profile-row">
            <small>Gestion</small>
            <strong>Depuis /profile</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
