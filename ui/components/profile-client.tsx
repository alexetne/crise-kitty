'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '../lib/auth';
import { apiRequest } from '../lib/api';

type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  status: 'active' | 'suspended' | 'disabled' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type MfaMethod = {
  id: string;
  methodType: 'totp_app' | 'sms';
  status: 'pending' | 'active' | 'disabled';
  label: string | null;
  phone: string | null;
  isPrimary: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TotpSetup = {
  method: MfaMethod;
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
};

type SmsSetup = {
  method: MfaMethod;
  expiresAt: string;
  deliveryPreview: {
    destination: string;
    code: string | null;
  } | null;
};

export function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [methods, setMethods] = useState<MfaMethod[]>([]);
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSetup, setSmsSetup] = useState<SmsSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfileAndMethods(token: string) {
    const [profilePayload, methodsPayload] = await Promise.all([
      apiRequest<Profile>('/auth/profile', { token }),
      apiRequest<{ methods: MfaMethod[] }>('/auth/mfa/methods', { token }),
    ]);

    setProfile(profilePayload);
    setMethods(methodsPayload.methods);
  }

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setError('Aucun token trouvé. Connecte-toi d abord.');
      setLoading(false);
      return;
    }

    void loadProfileAndMethods(token)
      .then(() => {
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

  async function refreshMethods() {
    const token = getToken();
    if (!token) {
      return;
    }

    const methodsPayload = await apiRequest<{ methods: MfaMethod[] }>(
      '/auth/mfa/methods',
      { token },
    );
    setMethods(methodsPayload.methods);
  }

  async function startTotpSetup() {
    const token = getToken();
    if (!token) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      const payload = await apiRequest<TotpSetup>('/auth/mfa/totp/setup', {
        method: 'POST',
        token,
      });
      setTotpSetup(payload);
      setNotice('Setup TOTP généré. Scanne le QR puis valide le code.');
      await refreshMethods();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Impossible de préparer le setup TOTP.',
      );
    }
  }

  async function enableTotp() {
    const token = getToken();
    if (!token) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await apiRequest<MfaMethod>('/auth/mfa/totp/enable', {
        method: 'POST',
        token,
        body: { code: totpCode },
      });
      setTotpSetup(null);
      setTotpCode('');
      setNotice('MFA TOTP activé.');
      await refreshMethods();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Impossible d activer TOTP.',
      );
    }
  }

  async function startSmsSetup() {
    const token = getToken();
    if (!token) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      const payload = await apiRequest<SmsSetup>('/auth/mfa/sms/setup', {
        method: 'POST',
        token,
        body: { phone: smsPhone },
      });
      setSmsSetup(payload);
      setNotice('Code SMS émis. Valide-le pour activer la méthode.');
      await refreshMethods();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Impossible de préparer le MFA SMS.',
      );
    }
  }

  async function enableSms() {
    const token = getToken();
    if (!token) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await apiRequest<MfaMethod>('/auth/mfa/sms/enable', {
        method: 'POST',
        token,
        body: { code: smsCode },
      });
      setSmsCode('');
      setSmsSetup(null);
      setNotice('MFA SMS activé.');
      await refreshMethods();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Impossible d activer le MFA SMS.',
      );
    }
  }

  async function disableMethod(methodId: string) {
    const token = getToken();
    if (!token) {
      return;
    }

    setError(null);
    setNotice(null);

    try {
      await apiRequest<MfaMethod>('/auth/mfa/disable', {
        method: 'POST',
        token,
        body: { methodId },
      });
      setNotice('Méthode MFA désactivée.');
      await refreshMethods();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Impossible de désactiver la méthode MFA.',
      );
    }
  }

  return (
    <div className="profile-grid">
      <section className="panel profile-card">
        <span className="eyebrow">Profil connecté</span>
        <h1>Ton espace.</h1>
        <p>
          Vérification du JWT, récupération du profil, puis configuration du MFA
          via application d authentification ou SMS.
        </p>

        {loading ? <div className="success">Chargement du profil...</div> : null}
        {!loading && error ? <div className="alert">{error}</div> : null}
        {notice ? <div className="success">{notice}</div> : null}

        {profile ? (
          <div className="profile-list">
            <div className="profile-row">
              <small>Identifiant</small>
              <strong>{profile.id}</strong>
            </div>
            <div className="profile-row">
              <small>Email</small>
              <strong>{profile.email}</strong>
            </div>
            <div className="profile-row">
              <small>Nom</small>
              <strong>
                {profile.displayName ??
                  `${profile.firstName} ${profile.lastName}`}
              </strong>
            </div>
            <div className="profile-row">
              <small>Statut</small>
              <strong>{profile.status}</strong>
            </div>
            <div className="profile-row">
              <small>Créé le</small>
              <strong>{new Date(profile.createdAt).toLocaleString('fr-FR')}</strong>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="aside-card">
        <span className="pill">MFA</span>
        <h2>Protection du compte</h2>
        <p className="muted">
          Active une application TOTP ou un second facteur par SMS. Le login
          exigera ensuite ce code avant d émettre le JWT final.
        </p>

        <div className="profile-list">
          {methods.map((method) => (
            <div className="profile-row" key={method.id}>
              <small>
                {method.methodType === 'sms' ? 'SMS' : 'Authenticator App'}
                {method.isPrimary ? ' • primaire' : ''}
              </small>
              <strong>
                {method.label ?? (method.phone || method.methodType)}
              </strong>
              <div className="inline-actions">
                <span className="pill">{method.status}</span>
                {method.status !== 'disabled' ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {
                      void disableMethod(method.id);
                    }}
                  >
                    Désactiver
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="field" style={{ marginTop: '1rem' }}>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              void startTotpSetup();
            }}
          >
            Configurer TOTP
          </button>
        </div>

        {totpSetup ? (
          <div className="profile-row">
            <small>QR Code TOTP</small>
            <img
              alt="QR code TOTP"
              src={totpSetup.qrCodeDataUrl}
              style={{ width: '100%', maxWidth: '220px', borderRadius: '18px' }}
            />
            <small>Secret manuel</small>
            <strong>{totpSetup.secret}</strong>
            <div className="field">
              <label htmlFor="totp-code">Code TOTP</label>
              <input
                id="totp-code"
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value)}
                placeholder="123456"
              />
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void enableTotp();
              }}
            >
              Activer TOTP
            </button>
          </div>
        ) : null}

        <div className="field" style={{ marginTop: '1rem' }}>
          <label htmlFor="sms-phone">Téléphone pour SMS</label>
          <input
            id="sms-phone"
            value={smsPhone}
            onChange={(event) => setSmsPhone(event.target.value)}
            placeholder="+33600000000"
          />
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            void startSmsSetup();
          }}
        >
          Envoyer un code SMS
        </button>

        {smsSetup ? (
          <div className="profile-row" style={{ marginTop: '1rem' }}>
            <small>SMS envoyé vers</small>
            <strong>{smsSetup.deliveryPreview?.destination}</strong>
            {smsSetup.deliveryPreview?.code ? (
              <div className="success">
                Code de développement :{' '}
                <strong>{smsSetup.deliveryPreview.code}</strong>
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="sms-code">Code SMS</label>
              <input
                id="sms-code"
                value={smsCode}
                onChange={(event) => setSmsCode(event.target.value)}
                placeholder="123456"
              />
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                void enableSms();
              }}
            >
              Activer SMS
            </button>
          </div>
        ) : null}

        <div className="inline-actions" style={{ marginTop: '1rem' }}>
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
