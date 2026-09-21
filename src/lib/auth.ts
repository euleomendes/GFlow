import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import * as bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { AuthenticatedUser, UserRoleKey } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gflow-tv-guararapes-secret-key-2026-super-secure'
);
const COOKIE_NAME = 'gflow_session';
const SESSION_EXPIRATION = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        executive: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;

    const permissions = user.role.permissions.map((rp) => rp.permission.key);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleKey: user.role.key as UserRoleKey,
      roleName: user.role.name,
      permissions,
      executiveProfile: user.executive
        ? {
            code: user.executive.code,
            phone: user.executive.phone,
          }
        : null,
    };
  } catch (error) {
    console.error('Erro ao obter usuário autenticado:', error);
    return null;
  }
}

export function hasPermission(user: AuthenticatedUser | null, permissionKey: string): boolean {
  if (!user) return false;
  if (user.roleKey === 'manager' || user.permissions.includes('FULL_ACCESS')) return true;
  return user.permissions.includes(permissionKey);
}

export function isManager(user: AuthenticatedUser | null): boolean {
  return user?.roleKey === 'manager';
}
