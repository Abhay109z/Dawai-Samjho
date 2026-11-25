import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../src/types.ts';
import { UserModel, type StoredUserRecord } from './models.ts';
import { isMongoConnected } from './mongo.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Use server-side SESSION_SECRET if configured, otherwise an ephemeral runtime key
const SIGNING_KEY =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const revokedTokenIds = new Set<string>();

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  authTokenId?: string;
}

interface SessionPayload {
  jti: string;
  sub: string;
  name: string;
  email: string | null;
  role: 'user' | 'guest';
  exp: number;
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

export function signSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    jti: crypto.randomBytes(12).toString('hex'),
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SIGNING_KEY).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): { user: AuthUser; jti: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SIGNING_KEY)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(providedSig, 'utf-8');
  const expBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf-8')
    ) as SessionPayload;

    if (!payload.sub || !payload.jti || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    if (revokedTokenIds.has(payload.jti)) return null;

    return {
      jti: payload.jti,
      user: {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role === 'guest' ? 'guest' : 'user',
      },
    };
  } catch {
    return null;
  }
}

export function revokeSessionToken(jti: string): void {
  revokedTokenIds.add(jti);
}

function readLocalUsers(): StoredUserRecord[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoredUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: StoredUserRecord[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function findUserByEmail(email: string): Promise<StoredUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (isMongoConnected()) {
    return UserModel.findOne({ email: normalized }, { _id: 0 }).lean<StoredUserRecord | null>();
  }
  return readLocalUsers().find((u) => u.email === normalized) ?? null;
}

export async function createUserAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const { salt, hash } = hashPassword(input.password);
  const record: StoredUserRecord = {
    id: `usr-${crypto.randomBytes(8).toString('hex')}`,
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
  };

  if (isMongoConnected()) {
    await UserModel.create(record);
  } else {
    const users = readLocalUsers();
    users.push(record);
    writeLocalUsers(users);
  }

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: 'user',
  };
}

export function createGuestUser(): AuthUser {
  return {
    id: `guest-${crypto.randomBytes(8).toString('hex')}`,
    name: 'Guest User',
    email: null,
    role: 'guest',
  };
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in or continue as guest.' });
    return;
  }

  const verified = verifySessionToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.authUser = verified.user;
  req.authTokenId = verified.jti;
  next();
}
