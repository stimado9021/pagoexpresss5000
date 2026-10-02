import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'default-secret';

export function generateVerificationToken(email: string): string {
  const timestamp = Date.now();
  const data = `${email}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
  return `${Buffer.from(`${email}:${timestamp}`).toString('base64')}.${signature}`;
}

export function verifyEmailToken(token: string): { email: string; valid: boolean } {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return { email: '', valid: false };

    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [email, timestamp] = decoded.split(':');
    if (!email || !timestamp) return { email: '', valid: false };

    const data = `${email}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');

    if (signature !== expectedSignature) return { email: '', valid: false };

    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 24 * 60 * 60 * 1000;
    if (tokenAge > maxAge) return { email: '', valid: false };

    return { email, valid: true };
  } catch {
    return { email: '', valid: false };
  }
}
