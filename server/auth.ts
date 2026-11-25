import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../src/types.ts';

// Signing secret read from server environment with ephemeral in-memory random fallback
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

interface TokenPayload {
  sub: string;
  name: string;
  email: string | null;
  role: 'user' | 'guest';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

/**
 * Hashes a user password with Node's crypto.scryptSync and a unique 16-byte random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Verifies a password against a stored salt:hash using constant-time comparison.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64').toString('utf8');
}

export function signSessionToken(user: AuthUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest();
  return `${encodedPayload}.${base64UrlEncode(sig)}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', SESSION_SECRET).update(encodedPayload).digest()
    );
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.sub || !parsed.exp || parsed.exp < now) {
      return null;
    }
    if (parsed.role !== 'user' && parsed.role !== 'guest') {
      return null;
    }

    return {
      id: parsed.sub,
      name: parsed.name,
      email: parsed.email ?? null,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in or continue as guest.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const user = verifySessionToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  req.authUser = user;
  next();
}

// Simple per-IP in-memory rate limiter for auth endpoints (20 attempts per 10 minutes)
const authAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const entry = authAttempts.get(ip);

  if (!entry || entry.resetAt < now) {
    authAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  if (entry.count >= 20) {
    res.status(429).json({
      error: 'Too many authentication attempts. Please wait a few minutes before trying again.',
    });
    return;
  }

  entry.count += 1;
  next();
}
