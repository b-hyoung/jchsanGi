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

function normalizeIpList(raw) {
  return String(raw || '')
    .split(/[\s,]+/)
    .map((v) => normalizeIp(v))
    .filter(Boolean);
}

function normalizeExamType(v) {
  const x = String(v || 'all').toLowerCase();
  if (x === 'written') return 'written';
  if (x === 'practical') return 'practical';
  if (x === 'sqld') return 'sqld';
  return 'all';
}

function isLocalhostIp(ip) {
  const v = normalizeIp(ip).toLowerCase();
  return v === '::1' || v === '127.0.0.1' || v === '::ffff:127.0.0.1' || v === 'localhost';
}

function getEventIp(event) {
  return normalizeIp(event?.payload?.__meta?.ipAddress || event?.payload?.ipAddress || '');
}

function getEventClientId(event) {
  return String(event?.clientId || '').trim();
}

function classifySessionId(sessionId) {
  const sid = String(sessionId || '').trim();
  if (!sid) return '';
  if (sid.startsWith('sqld-') || sid === 'sqld-index') return 'sqld';
  if (sid.startsWith('practical-')) return 'practical';
  return 'written';
}

function classifyEventCategory(event) {
  const direct = classifySessionId(event?.sessionId);
  if (direct) return direct;

  const path = String(event?.path || '').trim();
  if (path.startsWith('/sqld')) return 'sqld';
  if (path.startsWith('/practical')) return 'practical';
  if (path.startsWith('/test')) return 'written';

  const originSessionId = String(event?.payload?.originSessionId || '').trim();
  if (originSessionId) return classifySessionId(originSessionId);

  const outcomes = Array.isArray(event?.payload?.problemOutcomes) ? event.payload.problemOutcomes : [];
  const sourceSessionId = String(outcomes[0]?.sessionId || '').trim();
  if (sourceSessionId) return classifySessionId(sourceSessionId);

  return '';
}

function dateKey(iso) {
  return String(iso || '').slice(0, 10);
}

function matchIp(ip, query) {
  if (!query) return true;
  return ip.includes(query);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isWithinDays(ts, days) {
  if (!ts || !days) return false;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  return now - d.getTime() <= days * 24 * 60 * 60 * 1000;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = normalizeIp(searchParams.get('q'));
    const page = Math.max(1, toNumber(searchParams.get('page'), 1));
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, toNumber(searchParams.get('pageSize'), PAGE_SIZE_DEFAULT)));
    const sortByRaw = String(searchParams.get('sortBy') || 'lastSeen');
    const sortBy = sortByRaw === 'ip' ? 'identifier' : sortByRaw;
    const sortDir = String(searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const entity = String(searchParams.get('entity') || 'ip') === 'client' ? 'client' : 'ip';
    const scope = String(searchParams.get('scope') || 'all');
    const examType = normalizeExamType(searchParams.get('examType'));
    const excludeLocal = String(searchParams.get('excludeLocal') ?? '1') !== '0';
    const excludeIpsList = normalizeIpList(searchParams.get('excludeIps'));
    const excludeIpSet = new Set(excludeIpsList.map((v) => v.toLowerCase()));

    const events = await readEvents();
    const all = Array.isArray(events) ? events : [];

    const groups = new Map();
    let totalWithIp = 0;
    const today = getTodayKey();

    for (const e of all) {
      if (examType !== 'all' && classifyEventCategory(e) !== examType) continue;
      const ip = getEventIp(e);
      if (excludeLocal && isLocalhostIp(ip)) continue;
      if (ip && excludeIpSet.has(String(ip).toLowerCase())) continue;
      const clientId = getEventClientId(e);
      const identifier = entity === 'ip' ? ip : clientId;
      if (entity === 'ip' && !ip) continue;
      if (ip) totalWithIp += 1;
      if (!identifier) continue;
      if (!matchIp(identifier, q)) continue;

      if (!groups.has(identifier)) {
        groups.set(identifier, {
          identifier,
          entityType: entity,
          ipAddress: entity === 'ip' ? identifier : '',
          clientIdKey: entity === 'client' ? identifier : '',
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
          recent7dEventCount: 0,
          recent30dEventCount: 0,
          recent7dVisitCount: 0,
          recent30dVisitCount: 0,
          firstSeen: '',
          lastSeen: '',
          recentEvents: [],
          _clientIds: new Set(),
          _sessionIds: new Set(),
          _todayClientIds: new Set(),
          _ipAddresses: new Set(),
          _todayIpAddresses: new Set(),
        });
      }

      const row = groups.get(identifier);
      row.totalEvents += 1;
      if (e.type === 'visit_test') row.visitEvents += 1;
      if (e.type === 'start_exam') row.startEvents += 1;
      if (e.type === 'finish_exam') row.finishEvents += 1;
      if (e.type === 'report_problem') row.reportEvents += 1;

      const cid = clientId;
      if (cid) row._clientIds.add(cid);
      if (ip) row._ipAddresses.add(ip);
      const sid = String(e?.sessionId || '').trim();
      if (sid) row._sessionIds.add(sid);

      const ts = String(e?.timestamp || '');
      if (ts && (!row.firstSeen || ts < row.firstSeen)) row.firstSeen = ts;
      if (ts && (!row.lastSeen || ts > row.lastSeen)) row.lastSeen = ts;

      if (dateKey(ts) === today) {
        row.todayEventCount += 1;
        if (e.type === 'visit_test') row.todayVisitCount += 1;
        if (cid) row._todayClientIds.add(cid);
        if (ip) row._todayIpAddresses.add(ip);
      }

      if (isWithinDays(ts, 7)) {
        row.recent7dEventCount += 1;
        if (e.type === 'visit_test') row.recent7dVisitCount += 1;
      }
      if (isWithinDays(ts, 30)) {
        row.recent30dEventCount += 1;
        if (e.type === 'visit_test') row.recent30dVisitCount += 1;
      }

      row.recentEvents.push({
        id: String(e?.id || ''),
        timestamp: ts,
        type: String(e?.type || ''),
        clientId: cid,
        ipAddress: ip,
        sessionId: sid,
        path: String(e?.path || ''),
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const filteredClientIdUnion = new Set();
    const filteredIpUnion = new Set();
    let rows = Array.from(groups.values()).map((r) => {
      r._clientIds.forEach((v) => v && filteredClientIdUnion.add(String(v)));
      r._ipAddresses.forEach((v) => v && filteredIpUnion.add(String(v)));
      r.uniqueClientCount = r._clientIds.size;
      r.uniqueSessionCount = r._sessionIds.size;
      r.todayUniqueClientCount = r._todayClientIds.size;
      r.uniqueIpCount = r._ipAddresses.size;
      r.todayUniqueIpCount = r._todayIpAddresses.size;
      r.clientIdsPreview = Array.from(r._clientIds).slice(0, 5);
      r.ipAddressesPreview = Array.from(r._ipAddresses).slice(0, 5);
      r.recentEvents = r.recentEvents
        .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
        .slice(0, 20);
      delete r._clientIds;
      delete r._sessionIds;
      delete r._todayClientIds;
      delete r._ipAddresses;
      delete r._todayIpAddresses;
      return r;
    });

    if (scope === 'today') {
      rows = rows.filter((r) => r.todayEventCount > 0);
    } else if (scope === 'todayVisit') {
      rows = rows.filter((r) => r.todayVisitCount > 0);
    } else if (scope === '7d') {
      rows = rows.filter((r) => r.recent7dEventCount > 0);
    } else if (scope === '30d') {
      rows = rows.filter((r) => r.recent30dEventCount > 0);
    }

    const estimatedExternalUniqueClients =
      entity === 'client'
        ? rows.length
        : filteredClientIdUnion.size;

    rows.sort((a, b) => {
      if (sortBy === 'identifier') {
        const d = String(a.identifier).localeCompare(String(b.identifier)) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'totalEvents') {
        const d = (a.totalEvents - b.totalEvents) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'uniqueClients') {
        const av = entity === 'client' ? (a.uniqueIpCount || 0) : (a.uniqueClientCount || 0);
        const bv = entity === 'client' ? (b.uniqueIpCount || 0) : (b.uniqueClientCount || 0);
        const d = (av - bv) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'todayVisits') {
        const d = (a.todayVisitCount - b.todayVisitCount) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'todayEvents') {
        const d = (a.todayEventCount - b.todayEventCount) * dir;
        if (d !== 0) return d;
      }
      if (sortBy === 'recent7d') {
        const d = (a.recent7dEventCount - b.recent7dEventCount) * dir;
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
        matchedRows: totalIps,
        matchedIps: entity === 'ip' ? totalIps : undefined,
        estimatedExternalUniqueClients,
        estimatedExternalUniqueIps: entity === 'ip' ? rows.length : filteredIpUnion.size,
        entity,
        scope,
        excludeLocal,
        excludeIps: excludeIpsList,
        examType,
      },
      rows: pagedRows,
      page: safePage,
      pageSize,
      totalPages,
      sortBy,
      sortDir,
      filters: { q, entity, scope },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: 'failed to load ip search data', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
