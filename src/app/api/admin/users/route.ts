import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isManager, hashPassword } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isManager(currentUser)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas gerentes podem gerenciar utilizadores.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        role: true,
        executive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro ao carregar utilizadores.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isManager(currentUser)) {
      return NextResponse.json({ error: 'Acesso negado. Apenas gerentes podem criar utilizadores.' }, { status: 403 });
    }

    const { name, email, password, roleKey, phone, code } = await request.json();

    if (!name || !email || !password || !roleKey) {
      return NextResponse.json({ error: 'Nome, e-mail, senha e perfil são obrigatórios.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Já existe um utilizador cadastrado com este e-mail.' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { key: roleKey },
    });

    if (!role) {
      return NextResponse.json({ error: 'Perfil inválido especificado.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
        executive:
          roleKey === 'executive'
            ? {
                create: {
                  phone: phone || null,
                  code: code || null,
                  hireDate: new Date(),
                },
              }
            : undefined,
      },
      include: {
        role: true,
        executive: true,
      },
    });

    // Registrar na Auditoria (Seção 27)
    await recordAuditLog({
      actorUserId: currentUser.id,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      beforeData: null,
      afterData: {
        name: newUser.name,
        email: newUser.email,
        role: role.key,
        phone,
        code,
      },
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        roleKey: newUser.role.key,
        roleName: newUser.role.name,
      },
    });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar utilizador.' }, { status: 500 });
  }
}
