/**
 * Authentication utilities
 *
 * Lightweight custom JWT session system.
 * All auth operations happen server-side only.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { SystemRole } from '@/generated/prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const SESSION_COOKIE = 'rms_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ─── Password Hashing ───────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT Token Management ───────────────────────────────────────────

interface SessionPayload {
  userId: string;
  email: string;
  role: SystemRole;
}

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Session Cookie Helpers ─────────────────────────────────────────

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ─── Get Current User ───────────────────────────────────────────────

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

// ─── Role Guard ─────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<SystemRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  MANAGER: 2,
  SUPERADMIN: 3,
};

export function requireRole(
  userRole: SystemRole,
  minimumRole: SystemRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export { SESSION_COOKIE };
