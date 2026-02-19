import { NextResponse } from 'next/server';
import { aggregateMetrics, readEvents } from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await readEvents();
    const metrics = aggregateMetrics(events);
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ message: 'failed to load metrics' }, { status: 500 });
  }
}
