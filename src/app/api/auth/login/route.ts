import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Utilizador inativo ou bloqueado. Contate o administrador.' },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    // Update last login (não bloqueia o login caso o filesystem esteja temporariamente restrito)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (updateErr) {
      console.warn('[Auth] Não foi possível atualizar lastLoginAt:', updateErr);
    }

    const token = await createSessionToken({ userId: user.id });
    await setSessionCookie(token);

    // Audit log (não bloqueia a autenticação)
    try {
      await recordAuditLog({
        actorUserId: user.id,
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        afterData: { email: user.email, role: user.role.key },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    } catch (auditErr) {
      console.warn('[Auth] Não foi possível gravar auditoria de login:', auditErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleKey: user.role.key,
        roleName: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.key),
      },
    });
  } catch (error: any) {
    console.error('Erro na rota de login:', error);
    return NextResponse.json(
      {
        error: 'Erro interno ao processar autenticação.',
        message: error?.message || 'Falha ao acessar o banco de dados.',
      },
      { status: 500 }
    );
  }
}
