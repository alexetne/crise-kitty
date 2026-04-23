'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { apiRequest } from '../lib/api';
import { getToken, logout } from '../lib/auth';

type SessionPolicy = {
  inactivityTimeoutMinutes: number;
  source: 'default' | 'organization';
  organizationId: string | null;
  organizationName: string | null;
};

const activityEvents: Array<keyof WindowEventMap> = [
  'pointerdown',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
];

export function SessionTimeoutGuard() {
  const pathname = usePathname();
  const timerRef = useRef<number | null>(null);
  const timeoutMsRef = useRef<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const triggerLogout = () => {
      void logout().finally(() => {
        window.location.href = '/login';
      });
    };

    const resetTimer = () => {
      if (!timeoutMsRef.current) {
        return;
      }

      clearTimer();
      timerRef.current = window.setTimeout(() => {
        triggerLogout();
      }, timeoutMsRef.current);
    };

    const handleActivity = () => {
      resetTimer();
    };

    void apiRequest<SessionPolicy>('/auth/session-policy', { token })
      .then((policy) => {
        timeoutMsRef.current = policy.inactivityTimeoutMinutes * 60 * 1000;
        resetTimer();
      })
      .catch(() => {
        clearTimer();
      });

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleActivity);

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleActivity);
    };
  }, [pathname]);

  return null;
}
