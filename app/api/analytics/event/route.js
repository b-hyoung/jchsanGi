import { NextResponse } from 'next/server';
import { appendEvent } from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.type || !body?.clientId) {
      return NextResponse.json({ ok: false, message: 'type and clientId are required' }, { status: 400 });
    }

    const event = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: String(body.type),
      clientId: String(body.clientId),
      sessionId: body.sessionId != null ? String(body.sessionId) : null,
      payload: body.payload ?? {},
      path: body.path ?? null,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') ?? null,
    };

    await appendEvent(event);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed to record event' }, { status: 500 });
  }
}
