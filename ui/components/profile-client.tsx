'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '../lib/auth';
import { apiRequest } from '../lib/api';

type Profile = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setError('Aucun token trouvé. Connecte-toi d abord.');
      setLoading(false);
      return;
    }

    void apiRequest<Profile>('/auth/profile', { token })
      .then((payload) => {
        setProfile(payload);
        setError(null);
      })
      .catch((caughtError) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Impossible de charger le profil.',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="profile-grid">
      <section className="panel profile-card">
        <span className="eyebrow">Profil connecté</span>
        <h1>Ton espace.</h1>
        <p>
          Vérification du JWT, récupération du profil, puis affichage des données
          utilisateur sans faux mock.
        </p>

        {loading ? <div className="success">Chargement du profil...</div> : null}
        {!loading && error ? <div className="alert">{error}</div> : null}

        {profile ? (
          <div className="profile-list">
            <div className="profile-row">
              <small>Identifiant</small>
              <strong>#{profile.id}</strong>
            </div>
            <div className="profile-row">
              <small>Email</small>
              <strong>{profile.email}</strong>
            </div>
            <div className="profile-row">
              <small>Nom</small>
              <strong>{profile.name ?? 'Non renseigné'}</strong>
            </div>
            <div className="profile-row">
              <small>Créé le</small>
              <strong>{new Date(profile.createdAt).toLocaleString('fr-FR')}</strong>
            </div>
            <div className="profile-row">
              <small>Dernière mise à jour</small>
              <strong>{new Date(profile.updatedAt).toLocaleString('fr-FR')}</strong>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="aside-card">
        <span className="pill">Actions</span>
        <h2>Session</h2>
        <p className="muted">
          Le token est stocké dans le navigateur. Tu peux le purger puis relancer
          un cycle complet register/login/profile.
        </p>
        <div className="inline-actions">
          <Link className="button button-secondary" href="/login">
            Retour au login
          </Link>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              clearToken();
              setProfile(null);
              setError('Token supprimé. Reconnecte-toi.');
            }}
          >
            Vider le token
          </button>
        </div>
      </aside>
    </div>
  );
}
