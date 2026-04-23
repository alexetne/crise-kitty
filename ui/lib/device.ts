'use client';

const DEVICE_KEY = 'crise-kitty-device-id';

export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') {
    return null;
  }

  const existingDeviceId = window.localStorage.getItem(DEVICE_KEY);
  if (existingDeviceId) {
    return existingDeviceId;
  }

  const generatedDeviceId = window.crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, generatedDeviceId);

  return generatedDeviceId;
}
