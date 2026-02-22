import { NextResponse } from 'next/server';
import { appendEvent } from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

const DISCORD_REPORT_WEBHOOK_URL = process.env.DISCORD_REPORT_WEBHOOK_URL || '';
const ADMIN_DASHBOARD_URL = process.env.ADMIN_DASHBOARD_URL || 'https://jvbhs.netlify.app/admin';
const SESSION_LABELS = {
  '1': '2024년 1회차',
  '2': '2024년 2회차',
  '3': '2024년 3회차',
  '4': '2024년 2회차',
  '5': '2024년 3회차',
  '6': '2023년 1회차',
  '7': '2023년 2회차',
  '8': '2023년 3회차',
  '9': '2022년 1회차',
  '10': '2022년 2회차',
  '11': '2022년 3회차',
  '12': '개발자 문제 60',
  '100': '100문제 모드',
  random: '랜덤풀기',
  random22: '랜덤보기22',
};

function escapeDiscord(value) {
  return String(value ?? '')
    .replace(/[`*_~|>]/g, '\\$&')
    .trim();
}

function sessionLabel(sessionId) {
  const key = String(sessionId ?? '').trim();
  if (/^random22-\d{4}$/.test(key)) {
    return `랜덤보기22 (${key.slice(-4)}년)`;
  }
  return SESSION_LABELS[key] || key || '-';
}

function formatKoreanDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '-');
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}년 ${mm}월 ${dd}일 ${hh}시 ${mi}분`;
}

async function sendDiscordReport(event) {
  if (!DISCORD_REPORT_WEBHOOK_URL) return;
  if (event.type !== 'report_problem') return;

  const payload = event.payload ?? {};
  const sessionIdRaw = payload.originSessionId || event.sessionId || '-';
  const sessionId = sessionLabel(sessionIdRaw);
  const problemNumber = payload.originProblemNumber || payload.problemNumber || '-';
  const reason = payload.reason || '-';
  const questionText = payload.questionText || '-';

  const detail = [
    '🚨 **문제 신고 접수**',
    `- 회차: ${escapeDiscord(sessionId)}`,
    `- 문항: ${escapeDiscord(problemNumber)}`,
    `- 사유: ${escapeDiscord(reason)}`,
    `- 시간: ${escapeDiscord(formatKoreanDateTime(event.timestamp))}`,
    `- 요약: ${escapeDiscord(questionText).slice(0, 180)}`,
  ].join('\n');
  const content = `\`\`\`\n${detail}\n\`\`\`\n확인하기: ${ADMIN_DASHBOARD_URL}`;

  await fetch(DISCORD_REPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

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
    sendDiscordReport(event).catch(() => {
      // Report notifications should not break analytics ingestion.
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: 'failed to record event' }, { status: 500 });
  }
}
