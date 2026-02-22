import { NextResponse } from 'next/server';
import { readEvents } from '@/lib/analyticsStore';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

function toNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeIp(ip) {
  return String(ip || '').trim();
}

function getEventIp(event) {
  return normalizeIp(event?.payload?.__meta?.ipAddress || event?.payload?.ipAddress || '');
}

function dateKey(iso) {
  return String(iso || '').slice(0, 10);
}

function matchIp(ip, query) {
  if (!query) return true;
  return ip.includes(query);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = normalizeIp(searchParams.get('q'));
    const page = Math.max(1, toNumber(searchParams.get('page'), 1));
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, toNumber(searchParams.get('pageSize'), PAGE_SIZE_DEFAULT)));
    const sortBy = String(searchParams.get('sortBy') || 'lastSeen');
    const sortDir = String(searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const events = await readEvents();
    const all = Array.isArray(events) ? events : [];

    const groups = new Map();
    let totalWithIp = 0;

    for (const e of all) {
      const ip = getEventIp(e);
      if (!ip) continue;
      totalWithIp += 1;
      if (!matchIp(ip, q)) continue;

      if (!groups.has(ip)) {
        groups.set(ip, {
          ipAddress: ip,
          totalEvents: 0,
          visitEvents: 0,
          startEvents: 0,
          finishEvents: 0,
          reportEvents: 0,
          uniqueClientCount: 0,
          uniqueSessionCount: 0,
          todayEventCount: 0,
          todayVisitCount: 0,
          todayUniqueClientCount: 0,
          firstSeen: '',
          lastSeen: '',
          recentEvents: [],
          _clientIds: new Set(),
          _sessionIds: new Set(),
          _todayClientIds: new Set(),
        });
      }

      const row = groups.get(ip);
      row.totalEvents += 1;
      if (e.type === 'visit_test') row.visitEvents += 1;
      if (e.type === 'start_exam') row.startEvents += 1;
      if (e.type === 'finish_exam') row.finishEvents += 1;
      if (e.type === 'report_problem') row.reportEvents += 1;

      const cid = String(e?.clientId || '').trim();
      if (cid) row._clientIds.add(cid);
      const sid = String(e?.sessionId || '').trim();
      if (sid) row._sessionIds.add(sid);

      const ts = String(e?.timestamp || '');
      if (ts && (!row.firstSeen || ts < row.firstSeen)) row.firstSeen = ts;
      if (ts && (!row.lastSeen || ts > row.lastSeen)) row.lastSeen = ts;

      const today = new Date().toISOString().slice(0, 10);
      if (dateKey(ts) === today) {
        row.todayEventCount += 1;
        if (e.type === 'visit_test') row.todayVisitCount += 1;
        if (cid) row._todayClientIds.add(cid);
      }

      row.recentEvents.push({
        id: String(e?.id || ''),
        timestamp: ts,
        type: String(e?.type || ''),
        clientId: cid,
        sessionId: sid,
        path: String(e?.path || ''),
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const rows = Array.from(groups.values()).map((r) => {
      r.uniqueClientCount = r._clientIds.size;
      r.uniqueSessionCount = r._sessionIds.size;
      r.todayUniqueClientCount = r._todayClientIds.size;
      r.clientIdsPreview = Array.from(r._clientIds).slice(0, 5);
      r.recentEvents = r.recentEvents
        .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
        .slice(0, 20);
      delete r._clientIds;
      delete r._sessionIds;
      delete r._todayClientIds;
      return r;
    });

    rows.sort((a, b) => {
      if (sortBy === 'ip') {
        const d = String(a.ipAddress).localeCompare(String(b.ipAddress)) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'totalEvents') {
        const d = (a.totalEvents - b.totalEvents) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'uniqueClients') {
        const d = (a.uniqueClientCount - b.uniqueClientCount) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'todayVisits') {
        const d = (a.todayVisitCount - b.todayVisitCount) * dir;
        if (d !== 0) return d;
      }
      const d = String(a.lastSeen || '').localeCompare(String(b.lastSeen || '')) * dir;
      if (d !== 0) return d;
      return (b.totalEvents - a.totalEvents);
    });

    const totalIps = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalIps / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pagedRows = rows.slice(start, start + pageSize);

    return NextResponse.json({
      ok: true,
      summary: {
        query: q,
        totalEvents: all.length,
        totalEventsWithIp: totalWithIp,
        matchedIps: totalIps,
      },
      rows: pagedRows,
      page: safePage,
      pageSize,
      totalPages,
      sortBy,
      sortDir,
      filters: { q },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: 'failed to load ip search data', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}

