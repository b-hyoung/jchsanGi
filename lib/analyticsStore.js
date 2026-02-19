import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'analytics-events.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_EVENTS_TABLE = process.env.SUPABASE_EVENTS_TABLE || 'analytics_events';
const SUPABASE_PAGE_SIZE = 1000;

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseRestUrl() {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_EVENTS_TABLE}`;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function toDbEvent(event) {
  return {
    id: event.id,
    type: event.type,
    client_id: event.clientId,
    session_id: event.sessionId,
    payload: event.payload ?? {},
    path: event.path,
    timestamp: event.timestamp,
    user_agent: event.userAgent,
  };
}

function fromDbEvent(row) {
  return {
    id: row.id,
    type: row.type,
    clientId: row.client_id,
    sessionId: row.session_id,
    payload: row.payload ?? {},
    path: row.path,
    timestamp: row.timestamp,
    userAgent: row.user_agent,
  };
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, '[]', 'utf8');
  }
}

async function readEventsFromFileStore() {
  await ensureStore();
  const raw = await fs.readFile(EVENTS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readEventsFromSupabase() {
  const all = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const response = await fetch(`${supabaseRestUrl()}?select=*&order=timestamp.asc`, {
      method: 'GET',
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        'Range-Unit': 'items',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`supabase read failed: ${response.status}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch.map(fromDbEvent));
    if (batch.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return all;
}

async function appendEventToSupabase(event) {
  const response = await fetch(supabaseRestUrl(), {
    method: 'POST',
    headers: supabaseHeaders({
      Prefer: 'return=minimal',
    }),
    body: JSON.stringify(toDbEvent(event)),
  });

  if (!response.ok) {
    throw new Error(`supabase write failed: ${response.status}`);
  }
}

export async function readEvents() {
  if (hasSupabaseConfig()) {
    try {
      return await readEventsFromSupabase();
    } catch {
      // Fall back to local file store when Supabase is unavailable.
    }
  }
  return readEventsFromFileStore();
}

export async function appendEvent(event) {
  if (hasSupabaseConfig()) {
    try {
      await appendEventToSupabase(event);
      return;
    } catch {
      // Fall back to local file store when Supabase is unavailable.
    }
  }

  const events = await readEvents();
  events.push(event);
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

async function deleteReportEventsInSupabase({ ids = [], all = false } = {}) {
  if (!hasSupabaseConfig()) return 0;

  const headers = supabaseHeaders({
    Prefer: 'return=representation',
  });

  if (all) {
    const response = await fetch(`${supabaseRestUrl()}?type=eq.report_problem&select=id`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error(`supabase delete(all) failed: ${response.status}`);
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) ? rows.length : 0;
  }

  const cleanIds = [...new Set((ids || []).map((x) => String(x).trim()).filter(Boolean))];
  if (cleanIds.length === 0) return 0;

  const chunkSize = 100;
  let deleted = 0;
  for (let i = 0; i < cleanIds.length; i += chunkSize) {
    const chunk = cleanIds.slice(i, i + chunkSize);
    const inFilter = chunk.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',');
    const response = await fetch(
      `${supabaseRestUrl()}?type=eq.report_problem&id=in.(${encodeURIComponent(inFilter)})&select=id`,
      {
        method: 'DELETE',
        headers,
      }
    );
    if (!response.ok) throw new Error(`supabase delete(ids) failed: ${response.status}`);
    const rows = await response.json().catch(() => []);
    deleted += Array.isArray(rows) ? rows.length : 0;
  }
  return deleted;
}

async function deleteReportEventsInFileStore({ ids = [], all = false } = {}) {
  const events = await readEventsFromFileStore();
  const before = events.length;
  const idSet = new Set((ids || []).map((x) => String(x).trim()).filter(Boolean));

  const filtered = events.filter((e) => {
    if (e.type !== 'report_problem') return true;
    if (all) return false;
    if (idSet.size === 0) return true;
    return !idSet.has(String(e.id));
  });

  await fs.writeFile(EVENTS_FILE, JSON.stringify(filtered, null, 2), 'utf8');
  return before - filtered.length;
}

export async function deleteReportEvents({ ids = [], all = false } = {}) {
  if (hasSupabaseConfig()) {
    try {
      return await deleteReportEventsInSupabase({ ids, all });
    } catch {
      // Fall back to local store when Supabase is unavailable.
    }
  }
  return deleteReportEventsInFileStore({ ids, all });
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
      id: e.id,
      timestamp: e.timestamp,
      sessionId: e.sessionId || '-',
      problemNumber: e.payload?.problemNumber ?? '-',
      reason: e.payload?.reason || '-',
      questionText: e.payload?.questionText || '',
      originSessionId: e.payload?.originSessionId || '',
      originProblemNumber: e.payload?.originProblemNumber ?? '',
      originSourceKey: e.payload?.originSourceKey || '',
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
