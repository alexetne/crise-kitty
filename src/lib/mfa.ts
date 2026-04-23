import { createHash, randomInt } from 'node:crypto';

import { MfaChallengeStatus, MfaMethodStatus, MfaMethodType, type User, type UserMfaMethod } from '@prisma/client';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const MFA_CODE_TTL_MINUTES = 10;

export { MFA_CODE_TTL_MINUTES };

export function hashMfaCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export function generateEmailCode() {
  return String(randomInt(100_000, 1_000_000));
}

export function buildOtpAuth(email: string, secret?: string) {
  const totp = new OTPAuth.TOTP({
    issuer: 'Crise Kitty',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret ? OTPAuth.Secret.fromBase32(secret) : new OTPAuth.Secret(),
  });

  return totp;
}

export async function buildTotpSetup(user: User) {
  const totp = buildOtpAuth(user.email);

  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
    qrCodeDataUrl: await QRCode.toDataURL(totp.toString()),
  };
}

export function verifyTotpCode(secret: string, code: string) {
  const totp = buildOtpAuth('mfa@crise-kitty.local', secret);

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export function mapMfaMethod(method: UserMfaMethod) {
  return {
    id: method.id,
    methodType: method.methodType,
    status: method.status,
    label: method.label,
    email: method.email,
    isPrimary: method.isPrimary,
    verifiedAt: method.verifiedAt?.toISOString() ?? null,
    createdAt: method.createdAt.toISOString(),
    updatedAt: method.updatedAt.toISOString(),
  };
}

export function isActiveMfaMethod(method: UserMfaMethod) {
  return method.status === MfaMethodStatus.active && !method.disabledAt;
}

export function createChallengeExpiry() {
  return new Date(Date.now() + MFA_CODE_TTL_MINUTES * 60 * 1000);
}

export function isChallengeExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

export function getChallengeStatusFromExpiry(expiresAt: Date) {
  return isChallengeExpired(expiresAt)
    ? MfaChallengeStatus.expired
    : MfaChallengeStatus.pending;
}

export function defaultMfaLabel(methodType: MfaMethodType) {
  return methodType === MfaMethodType.email ? 'Primary Email' : 'Authenticator App';
}
