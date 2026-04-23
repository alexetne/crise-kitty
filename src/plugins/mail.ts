import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

declare module 'fastify' {
  interface FastifyInstance {
    mailer: {
      enabled: boolean;
      sendMfaCode: (input: { to: string; code: string; expiresInMinutes: number }) => Promise<void>;
    };
  }
}

function asBool(value: string | undefined) {
  return value === 'true' || value === '1';
}

export default fp(async (app) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = asBool(process.env.SMTP_SECURE);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? 'Crise Kitty <no-reply@example.com>';

  const enabled = Boolean(host);
  const transporter = enabled
    ? nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
      })
    : null;

  app.decorate('mailer', {
    enabled,
    async sendMfaCode({ to, code, expiresInMinutes }) {
      if (!transporter) {
        app.log.warn({ to }, 'SMTP not configured, skipping MFA email delivery');
        return;
      }

      await transporter.sendMail({
        from,
        to,
        subject: 'Your Crise Kitty MFA code',
        text: `Your MFA code is ${code}. It expires in ${expiresInMinutes} minutes.`,
        html: `<p>Your MFA code is <strong>${code}</strong>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`,
      });
    },
  });
});
