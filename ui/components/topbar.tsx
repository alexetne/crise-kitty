'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '../lib/auth';

export function Topbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
  }, []);

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">CK</span>
        <span>Crise Kitty</span>
      </Link>

      <nav className="nav">
        <Link href="/">Accueil</Link>
        <Link href="/register">Register</Link>
        <Link href="/login">Login</Link>
        <Link href="/profile">Profile</Link>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => {
              clearToken();
              setIsLoggedIn(false);
            }}
          >
            Logout
          </button>
        ) : null}
      </nav>
    </header>
  );
}
