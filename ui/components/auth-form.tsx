'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setToken } from '../lib/auth';
import { apiRequest } from '../lib/api';

type Mode = 'login' | 'register';

type AuthResponse = {
  accessToken: string;
  user: {
    id: number;
    email: string;
    name: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const payload = await apiRequest<AuthResponse>(
        isRegister ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: isRegister ? { name, email, password } : { email, password },
        },
      );

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
        <h1>{isRegister ? 'Créer un compte.' : 'Se connecter.'}</h1>
        <p>
          {isRegister
            ? 'Ton compte est branché directement sur l API Fastify et son auth JWT.'
            : 'Entre tes identifiants et récupère ton profil instantanément.'}
        </p>

        <form onSubmit={handleSubmit}>
          {error ? <div className="alert">{error}</div> : null}
          {success ? <div className="success">{success}</div> : null}

          {isRegister ? (
            <div className="field">
              <label htmlFor="name">Nom</label>
              <input
                id="name"
                name="name"
                placeholder="Alexandre"
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

          <div className="inline-actions">
            <button className="button button-primary" type="submit" disabled={isPending}>
              {isPending
                ? 'Envoi...'
                : isRegister
                  ? 'Créer mon compte'
                  : 'Entrer dans l espace'}
            </button>
            <Link className="button button-secondary" href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'J ai déjà un compte' : 'Créer un compte'}
            </Link>
          </div>
        </form>
      </section>

      <aside className="aside-card">
        <span className="pill">JWT actif</span>
        <h2>Ce que cette UI fait réellement</h2>
        <p className="muted">
          Elle parle à l API sur des endpoints réels, stocke le token localement,
          puis recharge le profil via le bearer token.
        </p>
        <div className="profile-list">
          <div className="profile-row">
            <small>Endpoint</small>
            <strong>{isRegister ? 'POST /auth/register' : 'POST /auth/login'}</strong>
          </div>
          <div className="profile-row">
            <small>Persistance</small>
            <strong>localStorage</strong>
          </div>
          <div className="profile-row">
            <small>Prochaine étape</small>
            <strong>GET /auth/profile</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
