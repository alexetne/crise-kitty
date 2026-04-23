'use client';

import { apiRequest } from './api';

const TOKEN_KEY = 'crise-kitty-token';

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function logout() {
  const token = getToken();

  try {
    if (token) {
      await apiRequest<{ message: string }>('/auth/logout', {
        method: 'POST',
        token,
      });
    }
  } finally {
    clearToken();
  }
}
