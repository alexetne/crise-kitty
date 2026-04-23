import Link from 'next/link';
import { Topbar } from '../components/topbar';

export default function HomePage() {
  return (
    <main className="page">
      <Topbar />

      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow">Next.js + Fastify + Prisma</span>
          <h1>Une vraie UI pour ton auth flow.</h1>
          <p>
            L interface couvre maintenant l accueil, l inscription, la connexion
            et le profil connecté. Elle appelle ton API Fastify réelle, pas une
            couche fictive.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/register">
              Commencer par register
            </Link>
            <Link className="button button-secondary" href="/login">
              Aller au login
            </Link>
          </div>
        </div>

        <div className="hero-side">
          <div className="stat-card">
            <span className="pill">Ports</span>
            <strong>5000 / 5001</strong>
            <p className="muted">UI sur Next.js, API sur Fastify.</p>
          </div>
          <div className="stat-card">
            <span className="pill">Endpoints</span>
            <strong>3 auth flows</strong>
            <p className="muted">Register, login, profile protégés par JWT.</p>
          </div>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Register</h2>
          <p className="muted">
            Création d utilisateur avec hash du mot de passe côté API, puis
            émission du token côté Fastify.
          </p>
        </article>
        <article className="panel">
          <h2>Login</h2>
          <p className="muted">
            Vérification email / mot de passe, récupération du JWT et stockage
            local pour les appels suivants.
          </p>
        </article>
        <article className="panel">
          <h2>Profile</h2>
          <p className="muted">
            Chargement du profil connecté via `Authorization: Bearer ...` et
            affichage des métadonnées utilisateur.
          </p>
        </article>
        <article className="panel">
          <h2>Simulation</h2>
          <p className="muted">
            L interface de simulation autosauvegarde l état localement et côté
            serveur pour reprendre exactement là où l utilisateur s est arrêté.
          </p>
        </article>
      </section>
    </main>
  );
}
