import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

const SESSION_TTL_DAYS = 7;

export function getRequestIp(request: FastifyRequest) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  return request.ip ?? null;
}

export function getRequestUserAgent(request: FastifyRequest) {
  const userAgent = request.headers['user-agent'];
  return typeof userAgent === 'string' && userAgent.length > 0 ? userAgent : null;
}

export function getRequestDeviceId(request: FastifyRequest) {
  const explicitDeviceId = request.headers['x-device-id'];
  if (typeof explicitDeviceId === 'string' && explicitDeviceId.length > 0) {
    return explicitDeviceId.slice(0, 120);
  }

  const fingerprintSource = `${getRequestUserAgent(request) ?? 'unknown-agent'}|${getRequestIp(request) ?? 'unknown-ip'}`;
  return createHash('sha256').update(fingerprintSource).digest('hex').slice(0, 40);
}

export function hashSessionSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

export function createSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isExpired(date: Date) {
  return date.getTime() <= Date.now();
}
