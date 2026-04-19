import nodemailer, {type Transporter} from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

let cachedTransporter: Transporter | null | undefined;

function getEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

function parsePositiveInteger(rawValue: string): number | null {
  if (!rawValue) return null;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function getEmailAuth() {
  const user = getEnv('NODEMAILER_AUTH_USER');
  const pass = getEnv('NODEMAILER_AUTH_PASS');
  if (!user || !pass) return null;
  return {user, pass};
}

function getTransportOptions(): SMTPTransport.Options | null {
  const provider = getEnv('NODEMAILER_SERVICE').toLowerCase();
  const auth = getEmailAuth();
  if (!auth) return null;

  const host = getEnv('NODEMAILER_HOST');
  const port = parsePositiveInteger(getEnv('NODEMAILER_PORT'));

  const options: SMTPTransport.Options = {
    auth,
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (provider === 'gmail') {
    options.service = 'gmail';
    return options;
  }

  if (host && port) {
    options.host = host;
    options.port = port;
    options.secure = port === 465;
    return options;
  }

  if (provider) {
    options.service = provider;
    return options;
  }

  return null;
}

export function getEmailTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const options = getTransportOptions();
  if (!options) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport(options);
  return cachedTransporter;
}
