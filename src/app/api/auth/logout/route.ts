import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (user) {
      await recordAuditLog({
        actorUserId: user.id,
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { error: 'Erro ao encerrar sessão.' },
      { status: 500 }
    );
  }
}
