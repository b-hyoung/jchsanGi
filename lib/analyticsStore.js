import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'analytics-events.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, '[]', 'utf8');
  }
}

export async function readEvents() {
  await ensureStore();
  const raw = await fs.readFile(EVENTS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendEvent(event) {
  const events = await readEvents();
  events.push(event);
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function dateKey(iso) {
  return String(iso || '').slice(0, 10);
}

function recentDates(days) {
  const list = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

export function aggregateMetrics(events) {
  const all = Array.isArray(events) ? events : [];
  const visits = all.filter((e) => e.type === 'visit_test');
  const starts = all.filter((e) => e.type === 'start_exam');
  const finishes = all.filter((e) => e.type === 'finish_exam');
  const reports = all.filter((e) => e.type === 'report_problem');

  const visitorSet = new Set(all.map((e) => e.clientId).filter(Boolean));
  const finishedUserSet = new Set(finishes.map((e) => e.clientId).filter(Boolean));
  const passCount = finishes.filter((e) => e.payload?.isOverallPass).length;

  const funnel = [
    { name: '방문', value: visitorSet.size },
    { name: '시험 시작', value: starts.length },
    { name: '완료', value: finishes.length },
    { name: '합격', value: passCount },
  ];

  const completionRate = starts.length > 0 ? (finishes.length / starts.length) * 100 : 0;
  const passRate = finishes.length > 0 ? (passCount / finishes.length) * 100 : 0;

  const dates = recentDates(14);
  const dayMap = new Map(
    dates.map((d) => [d, { date: d.slice(5), 방문: 0, 완료: 0, 합격률: 0, _finish: 0, _pass: 0 }])
  );

  visits.forEach((e) => {
    const key = dateKey(e.timestamp);
    const row = dayMap.get(key);
    if (row) row.방문 += 1;
  });

  finishes.forEach((e) => {
    const key = dateKey(e.timestamp);
    const row = dayMap.get(key);
    if (!row) return;
    row.완료 += 1;
    row._finish += 1;
    if (e.payload?.isOverallPass) row._pass += 1;
  });

  const dailyTrend = Array.from(dayMap.values()).map((r) => ({
    date: r.date,
    방문: r.방문,
    완료: r.완료,
    합격률: r._finish > 0 ? Number(((r._pass / r._finish) * 100).toFixed(1)) : 0,
  }));

  const sessionMap = new Map();
  starts.forEach((e) => {
    const key = String(e.sessionId || 'unknown');
    if (!sessionMap.has(key)) sessionMap.set(key, { session: key, 시작: 0, 완료: 0, 합격률: 0, _pass: 0 });
    sessionMap.get(key).시작 += 1;
  });

  finishes.forEach((e) => {
    const key = String(e.sessionId || 'unknown');
    if (!sessionMap.has(key)) sessionMap.set(key, { session: key, 시작: 0, 완료: 0, 합격률: 0, _pass: 0 });
    const row = sessionMap.get(key);
    row.완료 += 1;
    if (e.payload?.isOverallPass) row._pass += 1;
  });

  const sessionStats = Array.from(sessionMap.values())
    .map((r) => ({
      session: r.session,
      시작: r.시작,
      완료: r.완료,
      합격률: r.완료 > 0 ? Number(((r._pass / r.완료) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.session.localeCompare(b.session, 'ko'));

  const subjectAgg = { 1: [], 2: [], 3: [] };
  finishes.forEach((e) => {
    const scores = e.payload?.subjectCorrectCounts;
    if (!scores) return;
    [1, 2, 3].forEach((n) => {
      const v = Number(scores[n]);
      if (!Number.isNaN(v)) subjectAgg[n].push(v);
    });
  });

  const subjectAverages = [1, 2, 3].map((n) => {
    const arr = subjectAgg[n];
    const avgRaw = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const percent = Number(((avgRaw / 20) * 100).toFixed(1));
    return { subject: `${n}과목`, 정답률: percent };
  });

  const reasonCount = new Map();
  reports.forEach((e) => {
    const reason = String(e.payload?.reason || '기타');
    reasonCount.set(reason, (reasonCount.get(reason) || 0) + 1);
  });

  const reportReasons = Array.from(reasonCount.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const recentReports = reports
    .slice(-100)
    .reverse()
    .map((e) => ({
      timestamp: e.timestamp,
      sessionId: e.sessionId || '-',
      problemNumber: e.payload?.problemNumber ?? '-',
      reason: e.payload?.reason || '-',
      questionText: e.payload?.questionText || '',
    }));

  return {
    kpis: {
      visitors: visitorSet.size,
      completedUsers: finishedUserSet.size,
      completionRate: Number(completionRate.toFixed(1)),
      passRate: Number(passRate.toFixed(1)),
      totalStarts: starts.length,
      totalFinishes: finishes.length,
    },
    funnel,
    dailyTrend,
    sessionStats,
    subjectAverages,
    reportReasons,
    recentReports,
  };
}
