'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const emptyMetrics = {
  kpis: {
    visitors: 0,
    completedUsers: 0,
    completionRate: 0,
    passRate: 0,
    totalStarts: 0,
    totalFinishes: 0,
  },
  funnel: [],
  dailyTrend: [],
  sessionStats: [],
  subjectAverages: [],
  reportReasons: [],
  recentReports: [],
  gptFeedback: {
    summary: { total: 0, liked: 0, disliked: 0, netLikeRatio: 0 },
    items: [],
  },
};

const ADMIN_PASSWORD = 'testbob';
const ADMIN_AUTH_KEY = 'admin_auth_ok';

const LIST_TABS = [
  { key: 'kpi', label: '요약 리스트' },
  { key: 'daily', label: '일자별 리스트' },
  { key: 'session', label: '회차별 리스트' },
  { key: 'subject', label: '과목별 리스트' },
  { key: 'gptCache', label: 'GPT 캐시 조회' },
  { key: 'reports', label: '신고 리스트' },
];

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
  'random': '랜덤 모드',
  'random22': '랜덤22 셔플 테스트',
  '100': '100문제 모드',
};

const SOURCE_KEY_TO_SESSION_ID = {
  'NOW-60': '12',
  '2024-1': '1',
  '2024-2': '2',
  '2024-3': '3',
  '2023-1': '6',
  '2023-2': '7',
  '2023-3': '8',
  '2022-1': '9',
  '2022-2': '10',
  '2022-3': '11',
};

function sessionLabel(sessionId) {
  const key = String(sessionId || '').trim();
  return SESSION_LABELS[key] || key || '-';
}

function fmtTime(ts) {
  const raw = String(ts || '').trim();
  if (!raw) return '-';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.replace('T', ' ').slice(5, 16);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}월 ${dd}일 ${hh}시 ${mi}분`;
}

const emptyGptCacheAdmin = {
  summary: {
    totalRows: 0,
    totalHits: 0,
    filteredRows: 0,
    filteredHits: 0,
    subjects: [],
  },
  topProblems: [],
  rows: [],
  page: 1,
  pageSize: 20,
  totalPages: 1,
  sortBy: 'created_at',
  sortDir: 'desc',
  filters: { sessionId: '', problemNumber: '' },
};

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reports');
  const [showCharts, setShowCharts] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [problemDetail, setProblemDetail] = useState(null);
  const [expandedReportGroups, setExpandedReportGroups] = useState({});
  const [selectedReportGroups, setSelectedReportGroups] = useState({});
  const [selectedReportItems, setSelectedReportItems] = useState({});
  const [reportSortBy, setReportSortBy] = useState('count');
  const [reportSortDir, setReportSortDir] = useState('desc');
  const [detailSortState, setDetailSortState] = useState({});
  const [gptCacheData, setGptCacheData] = useState(emptyGptCacheAdmin);
  const [gptCacheLoading, setGptCacheLoading] = useState(false);
  const [gptCacheError, setGptCacheError] = useState('');
  const [gptCacheSortBy, setGptCacheSortBy] = useState('created_at');
  const [gptCacheSortDir, setGptCacheSortDir] = useState('desc');
  const [gptCachePage, setGptCachePage] = useState(1);
  const [gptCachePageSize, setGptCachePageSize] = useState(20);
  const [gptCacheSessionFilter, setGptCacheSessionFilter] = useState('');
  const [gptCacheProblemFilter, setGptCacheProblemFilter] = useState('');
  const [gptCacheFeedbackFilter, setGptCacheFeedbackFilter] = useState('all');
  const [gptTopSortBy, setGptTopSortBy] = useState('hits');
  const [gptTopSortDir, setGptTopSortDir] = useState('desc');
  const [selectedGptCacheRow, setSelectedGptCacheRow] = useState(null);

  const toggleReportSort = (column) => {
    if (reportSortBy === column) {
      setReportSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setReportSortBy(column);
    setReportSortDir(column === 'session' ? 'asc' : 'desc');
  };

  const sortMark = (column) => {
    if (reportSortBy !== column) return '↕';
    return reportSortDir === 'asc' ? '▲' : '▼';
  };

  const toggleGptCacheSort = (column) => {
    if (gptCacheSortBy === column) {
      setGptCacheSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setGptCacheSortBy(column);
      setGptCacheSortDir(column === 'session' || column === 'problem' || column === 'subject' ? 'asc' : 'desc');
    }
    setGptCachePage(1);
  };

  const gptCacheSortMark = (column) => {
    if (gptCacheSortBy !== column) return '↕';
    return gptCacheSortDir === 'asc' ? '▲' : '▼';
  };

  const toggleGptTopSort = (column) => {
    if (gptTopSortBy === column) {
      setGptTopSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setGptTopSortBy(column);
    setGptTopSortDir(column === 'session' || column === 'problem' || column === 'subject' ? 'asc' : 'desc');
  };

  const gptTopSortMark = (column) => {
    if (gptTopSortBy !== column) return '↕';
    return gptTopSortDir === 'asc' ? '▲' : '▼';
  };

  const toggleDetailSort = (groupKey, column) => {
    setDetailSortState((prev) => {
      const current = prev[groupKey] || { by: 'time', dir: 'desc' };
      if (current.by === column) {
        return {
          ...prev,
          [groupKey]: { ...current, dir: current.dir === 'asc' ? 'desc' : 'asc' },
        };
      }
      return {
        ...prev,
        [groupKey]: { by: column, dir: column === 'problem' ? 'asc' : 'desc' },
      };
    });
  };

  const detailSortMark = (groupKey, column) => {
    const current = detailSortState[groupKey] || { by: 'time', dir: 'desc' };
    if (current.by !== column) return '↕';
    return current.dir === 'asc' ? '▲' : '▼';
  };

  const getSortedDetailReports = (group) => {
    const current = detailSortState[group.key] || { by: 'time', dir: 'desc' };
    const dir = current.dir === 'asc' ? 1 : -1;
    const arr = [...(group?.reports || [])];
    arr.sort((a, b) => {
      if (current.by === 'problem') {
        const ap = Number(a?.problemNumber);
        const bp = Number(b?.problemNumber);
        const da = Number.isNaN(ap) ? 0 : ap;
        const db = Number.isNaN(bp) ? 0 : bp;
        const d = (da - db) * dir;
        if (d !== 0) return d;
      }
      const t = String(a?.timestamp || '').localeCompare(String(b?.timestamp || '')) * dir;
      if (t !== 0) return t;
      return String(a?.reason || '').localeCompare(String(b?.reason || ''), 'ko');
    });
    return arr;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setMetrics({ ...emptyMetrics, ...data });
    } catch {
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadGptCache = async () => {
    setGptCacheLoading(true);
    setGptCacheError('');
    try {
      const qs = new URLSearchParams({
        page: String(gptCachePage),
        pageSize: String(gptCachePageSize),
        sortBy: gptCacheSortBy,
        sortDir: gptCacheSortDir,
      });
      if (gptCacheSessionFilter) qs.set('sessionId', gptCacheSessionFilter);
      if (gptCacheProblemFilter) qs.set('problemNumber', gptCacheProblemFilter);
      if (gptCacheFeedbackFilter && gptCacheFeedbackFilter !== 'all') qs.set('feedbackFilter', gptCacheFeedbackFilter);

      const res = await fetch(`/api/admin/gpt-cache?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.message || 'failed');
      setGptCacheData({ ...emptyGptCacheAdmin, ...data });
    } catch {
      setGptCacheError('GPT 캐시 조회 데이터를 불러오지 못했습니다.');
    } finally {
      setGptCacheLoading(false);
    }
  };

  useEffect(() => {
    const ok = window.sessionStorage.getItem(ADMIN_AUTH_KEY) === '1';
    if (ok) {
      setUnlocked(true);
      load();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    if (tab !== 'gptCache') return;
    loadGptCache();
  }, [
    unlocked,
    tab,
    gptCachePage,
    gptCachePageSize,
    gptCacheSortBy,
    gptCacheSortDir,
    gptCacheSessionFilter,
    gptCacheProblemFilter,
    gptCacheFeedbackFilter,
  ]);

  const kpis = useMemo(() => metrics.kpis ?? emptyMetrics.kpis, [metrics]);
  const sortedGptTopProblems = useMemo(() => {
    const rows = [...(gptCacheData?.topProblems || [])];
    const dir = gptTopSortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (gptTopSortBy === 'subject') {
        const d = ((Number(a?.subject) || 0) - (Number(b?.subject) || 0)) * dir;
        if (d !== 0) return d;
      }
      if (gptTopSortBy === 'session') {
        const d = String(sessionLabel(a?.sourceSessionId)).localeCompare(String(sessionLabel(b?.sourceSessionId)), 'ko') * dir;
        if (d !== 0) return d;
      }
      if (gptTopSortBy === 'problem') {
        const d = ((Number(a?.sourceProblemNumber) || 0) - (Number(b?.sourceProblemNumber) || 0)) * dir;
        if (d !== 0) return d;
      }
      if (gptTopSortBy === 'likes') {
        const d = ((Number(a?.totalLike) || 0) - (Number(b?.totalLike) || 0)) * dir;
        if (d !== 0) return d;
      }
      if (gptTopSortBy === 'dislikes') {
        const d = ((Number(a?.totalDislike) || 0) - (Number(b?.totalDislike) || 0)) * dir;
        if (d !== 0) return d;
      }
      if (gptTopSortBy === 'cacheRows') {
        const d = ((Number(a?.cacheRows) || 0) - (Number(b?.cacheRows) || 0)) * dir;
        if (d !== 0) return d;
      }
      if (gptTopSortBy === 'latest') {
        const d = String(a?.latestCreatedAt || '').localeCompare(String(b?.latestCreatedAt || '')) * dir;
        if (d !== 0) return d;
      }
      const d = ((Number(a?.totalHits) || 0) - (Number(b?.totalHits) || 0)) * dir;
      if (d !== 0) return d;
      return String(b?.latestCreatedAt || '').localeCompare(String(a?.latestCreatedAt || ''));
    });
    return rows;
  }, [gptCacheData?.topProblems, gptTopSortBy, gptTopSortDir]);

  const groupedReports = useMemo(() => {
    const rows = Array.isArray(metrics.recentReports) ? metrics.recentReports : [];
    const map = new Map();

    rows.forEach((r, idx) => {
      const sourceSessionId = String(r.originSessionId || r.sessionId || '-').trim();
      const sourceProblemNumber = String(r.originProblemNumber || r.problemNumber || '-').trim();
      const key = `${sourceSessionId}:${sourceProblemNumber}`;
      const ts = String(r.timestamp || '');

      if (!map.has(key)) {
        map.set(key, {
          key,
          sourceSessionId,
          sourceProblemNumber,
          count: 0,
          latestTimestamp: ts,
          questionText: r.questionText || '',
          reports: [],
        });
      }

      const g = map.get(key);
      g.count += 1;
      if (ts > g.latestTimestamp) g.latestTimestamp = ts;
      if (!g.questionText && r.questionText) g.questionText = r.questionText;
      g.reports.push({ ...r, _idx: idx });
    });

    return Array.from(map.values()).map((g) => ({
      ...g,
      reports: g.reports.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))),
    }));
  }, [metrics.recentReports]);

  const sortedGroupedReports = useMemo(() => {
    const dir = reportSortDir === 'asc' ? 1 : -1;
    const arr = [...groupedReports];
    arr.sort((a, b) => {
      if (reportSortBy === 'count') {
        const d = (a.count - b.count) * dir;
        if (d !== 0) return d;
      }
      if (reportSortBy === 'latest') {
        const d = String(a.latestTimestamp || '').localeCompare(String(b.latestTimestamp || '')) * dir;
        if (d !== 0) return d;
      }
      if (reportSortBy === 'session') {
        const d = String(sessionLabel(a.sourceSessionId)).localeCompare(String(sessionLabel(b.sourceSessionId)), 'ko') * dir;
        if (d !== 0) return d;
      }
      if (b.count !== a.count) return (b.count - a.count);
      return String(b.latestTimestamp || '').localeCompare(String(a.latestTimestamp || ''));
    });
    return arr;
  }, [groupedReports, reportSortBy, reportSortDir]);

  const allGroupKeys = useMemo(() => sortedGroupedReports.map((g) => g.key), [sortedGroupedReports]);
  const selectedGroupKeys = useMemo(
    () => allGroupKeys.filter((k) => selectedReportGroups[k]),
    [allGroupKeys, selectedReportGroups]
  );
  const selectedReportIds = useMemo(() => {
    const ids = [];
    sortedGroupedReports.forEach((g) => {
      if (!selectedReportGroups[g.key]) return;
      g.reports.forEach((r) => {
        if (r?.id) ids.push(String(r.id));
      });
    });
    return [...new Set(ids)];
  }, [sortedGroupedReports, selectedReportGroups]);
  const isAllSelected = allGroupKeys.length > 0 && selectedGroupKeys.length === allGroupKeys.length;

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      window.sessionStorage.setItem(ADMIN_AUTH_KEY, '1');
      setUnlocked(true);
      setAuthError('');
      load();
      return;
    }
    setAuthError('비밀번호가 올바르지 않습니다.');
  };

  const closeDetail = () => {
    setSelectedReport(null);
    setProblemDetail(null);
    setDetailError('');
  };

  const openGptCacheDetail = (row) => {
    setSelectedGptCacheRow(row || null);
  };

  const closeGptCacheDetail = () => {
    setSelectedGptCacheRow(null);
  };

  const toggleReportGroup = (key) => {
    setExpandedReportGroups((prev) => {
      const isOpen = Boolean(prev[key]);
      if (isOpen) return {};
      return { [key]: true };
    });
  };

  const toggleSelectReportGroup = (key) => {
    setSelectedReportGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelectAllReportGroups = () => {
    if (isAllSelected) {
      setSelectedReportGroups({});
      return;
    }
    const next = {};
    allGroupKeys.forEach((k) => {
      next[k] = true;
    });
    setSelectedReportGroups(next);
  };

  const handleDeleteSelectedReports = async () => {
    if (selectedReportIds.length === 0) return;
    await handleDeleteByIds(selectedReportIds, `선택한 신고 ${selectedReportIds.length}건을 삭제할까요?`);
  };

  const openDetail = async (report) => {
    setSelectedReport(report);
    setProblemDetail(null);
    setDetailError('');
    setDetailLoading(true);

    const rawSid = String(report?.originSessionId || report?.sessionId || '').trim();
    const sourceKey = String(report?.originSourceKey || '').trim();
    const sid = rawSid && rawSid !== 'random' ? rawSid : SOURCE_KEY_TO_SESSION_ID[sourceKey] || rawSid;
    const pno = Number(report?.originProblemNumber || report?.problemNumber);
    if (!sid || sid === '-' || Number.isNaN(pno)) {
      setDetailLoading(false);
      setDetailError('이 신고는 회차/문항 정보가 부족해서 상세 조회가 어렵습니다.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/problem?sessionId=${encodeURIComponent(sid)}&problemNumber=${pno}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || 'failed');
      }
      const data = await res.json();
      setProblemDetail(data);
    } catch (e) {
      setDetailError(`상세 조회 실패: ${String(e?.message || 'unknown error')}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSelectReportItem = (id) => {
    const key = String(id || '').trim();
    if (!key) return;
    setSelectedReportItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllItemsSelectedByGroup = (group) => {
    const reports = group?.reports || [];
    const validIds = reports
      .map((r) => String(r?.id || '').trim())
      .filter(Boolean);
    if (validIds.length === 0) return false;
    return validIds.every((id) => Boolean(selectedReportItems[id]));
  };

  const toggleSelectAllItemsByGroup = (group) => {
    const reports = group?.reports || [];
    const validIds = reports
      .map((r) => String(r?.id || '').trim())
      .filter(Boolean);
    if (validIds.length === 0) return;

    const shouldSelectAll = !isAllItemsSelectedByGroup(group);
    setSelectedReportItems((prev) => {
      const next = { ...prev };
      validIds.forEach((id) => {
        next[id] = shouldSelectAll;
      });
      return next;
    });
  };

  const handleDeleteByIds = async (ids, confirmMessage = '선택한 신고를 삭제할까요?') => {
    const uniqueIds = [...new Set((ids || []).map((x) => String(x).trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    const ok = window.confirm(confirmMessage);
    if (!ok) return;

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: uniqueIds }),
      });
      if (!res.ok) throw new Error('failed');
      await load();
      setSelectedReportGroups({});
      setSelectedReportItems({});
      setExpandedReportGroups({});
      closeDetail();
      alert('선택한 신고가 삭제되었습니다.');
    } catch {
      alert('신고 삭제에 실패했습니다.');
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <form onSubmit={handleUnlock} className="w-full max-w-sm rounded-xl bg-white border border-slate-200 p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-slate-900">어드민 로그인</h1>
          <p className="mt-2 text-sm text-slate-600">비밀번호를 입력하세요.</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="비밀번호"
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          />
          {authError && <p className="mt-2 text-sm text-red-600">{authError}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-sky-600 text-white font-semibold py-2.5 hover:bg-sky-700"
          >
            들어가기
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">어드민 대시보드</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCharts((v) => !v)}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-800"
            >
              {showCharts ? '차트 숨기기' : '차트 보기'}
            </button>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
            >
              새로고침
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {LIST_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  tab === t.key
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'kpi' && (
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-3">요약 리스트</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-3">항목</th>
                    <th className="py-2 pr-3">값</th>
                  </tr>
                </thead>
                <tbody>
                  <Row k="방문자 수" v={kpis.visitors} />
                  <Row k="완주 사용자" v={kpis.completedUsers} />
                  <Row k="완주율" v={`${kpis.completionRate}%`} />
                  <Row k="전체 합격률" v={`${kpis.passRate}%`} />
                  <Row k="시험 시작 건수" v={kpis.totalStarts} />
                  <Row k="시험 완료 건수" v={kpis.totalFinishes} />
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'daily' && (
          <ListTable
            title="일자별 리스트"
            loading={loading}
            emptyText="데이터가 없습니다."
            headers={['일자', '방문', '완료', '합격률']}
            rows={metrics.dailyTrend.map((r) => [r.date, r.방문, r.완료, `${r.합격률}%`])}
          />
        )}

        {tab === 'session' && (
          <ListTable
            title="회차별 리스트"
            loading={loading}
            emptyText="데이터가 없습니다."
            headers={['회차', '시작', '완료', '합격률']}
            rows={metrics.sessionStats.map((r) => [r.session, r.시작, r.완료, `${r.합격률}%`])}
          />
        )}

        {tab === 'subject' && (
          <ListTable
            title="과목별 리스트"
            loading={loading}
            emptyText="데이터가 없습니다."
            headers={['과목', '평균 정답률']}
            rows={metrics.subjectAverages.map((r) => [r.subject, `${r.정답률}%`])}
          />
        )}

        {tab === 'gptCache' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-bold text-slate-900">GPT 이의신청 캐시 조회</h2>
                <button
                  onClick={loadGptCache}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-semibold"
                >
                  캐시 새로고침
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                <Info label="전체 캐시 행" value={gptCacheData?.summary?.totalRows ?? 0} />
                <Info label="전체 캐시 조회수" value={gptCacheData?.summary?.totalHits ?? 0} />
                <Info label="필터 결과 행" value={gptCacheData?.summary?.filteredRows ?? 0} />
                <Info label="필터 결과 조회수" value={gptCacheData?.summary?.filteredHits ?? 0} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {(gptCacheData?.summary?.subjects || []).map((s) => (
                  <div key={s.subject} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-bold text-slate-900">{s.subject}</div>
                    <div className="mt-1 text-xs text-slate-600">캐시 행 {s.rows} / 조회수 {s.hits}</div>
                  </div>
                ))}
              </div>

              {gptCacheError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                  {gptCacheError}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3">가장 많이 조회된 문제 (캐시 기준)</h3>
              {gptCacheLoading ? (
                <div className="text-slate-500">로딩 중...</div>
              ) : (gptCacheData?.topProblems || []).length === 0 ? (
                <div className="text-slate-500">캐시 데이터가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('subject')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>과목</span><span>{gptTopSortMark('subject')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('session')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>원본 회차</span><span>{gptTopSortMark('session')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('problem')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>원본 문항</span><span>{gptTopSortMark('problem')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('hits')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>캐시 조회수</span><span>{gptTopSortMark('hits')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('cacheRows')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>캐시 행 수</span><span>{gptTopSortMark('cacheRows')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('likes')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>좋아요</span><span>{gptTopSortMark('likes')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('dislikes')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>싫어요</span><span>{gptTopSortMark('dislikes')}</span>
                          </button>
                        </th>
                        <th className="py-2 pr-3">
                          <button onClick={() => toggleGptTopSort('latest')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                            <span>최근 생성</span><span>{gptTopSortMark('latest')}</span>
                          </button>
                        </th>
                        <th className="py-2">문제 요약</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedGptTopProblems.slice(0, 30).map((r) => (
                        <tr key={r.key} className="border-b border-slate-100">
                          <td className="py-2 pr-3">{r.subject ? `${r.subject}과목` : '-'}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{sessionLabel(r.sourceSessionId)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{r.sourceProblemNumber}</td>
                          <td className="py-2 pr-3 font-semibold text-slate-900">{r.totalHits}</td>
                          <td className="py-2 pr-3">{r.cacheRows}</td>
                          <td className="py-2 pr-3 text-emerald-700">{r.totalLike ?? 0}</td>
                          <td className="py-2 pr-3 text-rose-700">{r.totalDislike ?? 0}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(r.latestCreatedAt)}</td>
                          <td className="py-2">{r.sampleQuestionText || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-bold text-slate-900">캐시 상세 목록 (페이지네이션)</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-1">
                    <span className="text-slate-600">회차</span>
                    <select
                      value={gptCacheSessionFilter}
                      onChange={(e) => {
                        setGptCacheSessionFilter(e.target.value);
                        setGptCachePage(1);
                      }}
                      className="rounded border border-slate-300 px-2 py-1"
                    >
                      <option value="">전체</option>
                      {Object.entries(SESSION_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-1">
                    <span className="text-slate-600">문항</span>
                    <input
                      value={gptCacheProblemFilter}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setGptCacheProblemFilter(v);
                        setGptCachePage(1);
                      }}
                      placeholder="예: 12"
                      className="w-20 rounded border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <label className="flex items-center gap-1">
                    <span className="text-slate-600">피드백</span>
                    <select
                      value={gptCacheFeedbackFilter}
                      onChange={(e) => {
                        setGptCacheFeedbackFilter(e.target.value);
                        setGptCachePage(1);
                      }}
                      className="rounded border border-slate-300 px-2 py-1"
                    >
                      <option value="all">전체</option>
                      <option value="hasFeedback">평가 있음</option>
                      <option value="liked">좋아요 우세</option>
                      <option value="disliked">싫어요 우세</option>
                      <option value="likeOnly">좋아요 있음</option>
                      <option value="dislikeOnly">싫어요 있음</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-1">
                    <span className="text-slate-600">페이지 크기</span>
                    <select
                      value={gptCachePageSize}
                      onChange={(e) => {
                        setGptCachePageSize(Number(e.target.value));
                        setGptCachePage(1);
                      }}
                      className="rounded border border-slate-300 px-2 py-1"
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {gptCacheLoading ? (
                <div className="text-slate-500">로딩 중...</div>
              ) : (gptCacheData?.rows || []).length === 0 ? (
                <div className="text-slate-500">캐시 데이터가 없습니다.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                          <th className="py-2 pr-3">
                            <button onClick={() => toggleGptCacheSort('subject')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                              <span>과목</span><span>{gptCacheSortMark('subject')}</span>
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button onClick={() => toggleGptCacheSort('session')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                              <span>원본 회차</span><span>{gptCacheSortMark('session')}</span>
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button onClick={() => toggleGptCacheSort('problem')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                              <span>원본 문항</span><span>{gptCacheSortMark('problem')}</span>
                            </button>
                          </th>
                          <th className="py-2 pr-3">
                            <button onClick={() => toggleGptCacheSort('hits')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                              <span>조회수</span><span>{gptCacheSortMark('hits')}</span>
                            </button>
                          </th>
                          <th className="py-2 pr-3">좋아요</th>
                          <th className="py-2 pr-3">싫어요</th>
                          <th className="py-2 pr-3">
                            <button onClick={() => toggleGptCacheSort('created_at')} className="flex w-full items-center justify-between font-semibold hover:text-slate-900">
                              <span>생성시각</span><span>{gptCacheSortMark('created_at')}</span>
                            </button>
                          </th>
                          <th className="py-2">질문 요약</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(gptCacheData.rows || []).map((r) => (
                          <tr
                            key={r.cacheKey}
                            className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                            onClick={() => openGptCacheDetail(r)}
                          >
                            <td className="py-2 pr-3 whitespace-nowrap">{r.subject ? `${r.subject}과목` : '-'}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{sessionLabel(r.sourceSessionId)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{r.sourceProblemNumber}</td>
                            <td className="py-2 pr-3 font-semibold text-slate-900">{r.hitCount}</td>
                            <td className="py-2 pr-3 text-emerald-700">{r.likeCount}</td>
                            <td className="py-2 pr-3 text-rose-700">{r.dislikeCount}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(r.createdAt)}</td>
                            <td className="py-2">
                              <div className="max-w-[520px] truncate" title={r.questionText || r.userQuestion || ''}>
                                {r.questionText || r.userQuestion || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="text-slate-600">
                      페이지 {gptCacheData.page} / {gptCacheData.totalPages} · 현재 {gptCacheData.rows.length}건 표시
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGptCachePage((p) => Math.max(1, p - 1))}
                        disabled={gptCacheData.page <= 1}
                        className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => setGptCachePage((p) => Math.min(gptCacheData.totalPages || 1, p + 1))}
                        disabled={gptCacheData.page >= (gptCacheData.totalPages || 1)}
                        className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-slate-900">신고 리스트 (클릭하면 상세 확인)</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteSelectedReports}
                  disabled={selectedReportIds.length === 0}
                  className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  선택 삭제
                </button>
              </div>
            </div>
            <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
              <p className="mb-2 text-sm font-bold text-violet-900">GPT 답변 좋아요/싫어요 집계</p>
              <div className="mb-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className="rounded border border-violet-200 bg-white px-2 py-1">
                  총 평가: <span className="font-extrabold">{metrics?.gptFeedback?.summary?.total ?? 0}</span>
                </div>
                <div className="rounded border border-emerald-200 bg-white px-2 py-1 text-emerald-700">
                  좋아요: <span className="font-extrabold">{metrics?.gptFeedback?.summary?.liked ?? 0}</span>
                </div>
                <div className="rounded border border-rose-200 bg-white px-2 py-1 text-rose-700">
                  싫어요: <span className="font-extrabold">{metrics?.gptFeedback?.summary?.disliked ?? 0}</span>
                </div>
                <div className="rounded border border-violet-200 bg-white px-2 py-1">
                  호감도: <span className="font-extrabold">{metrics?.gptFeedback?.summary?.netLikeRatio ?? 0}%</span>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded border border-violet-200 bg-white">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-violet-100 bg-violet-50 text-left text-violet-900">
                      <th className="px-2 py-1">원본</th>
                      <th className="px-2 py-1">좋아요</th>
                      <th className="px-2 py-1">싫어요</th>
                      <th className="px-2 py-1">캐시사용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics?.gptFeedback?.items || []).slice(0, 30).map((r, i) => (
                      <tr key={`${r.cacheKey || i}`} className="border-b border-violet-50">
                        <td className="px-2 py-1">{sessionLabel(r.sourceSessionId)}-{r.sourceProblemNumber}</td>
                        <td className="px-2 py-1 font-semibold text-emerald-700">{r.like}</td>
                        <td className="px-2 py-1 font-semibold text-rose-700">{r.dislike}</td>
                        <td className="px-2 py-1">{r.hitCount}</td>
                      </tr>
                    ))}
                    {(!metrics?.gptFeedback?.items || metrics.gptFeedback.items.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-2 py-2 text-slate-500">아직 GPT 평가 데이터가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {loading ? (
              <div className="text-slate-500">로딩 중...</div>
            ) : sortedGroupedReports.length === 0 ? (
              <div className="text-slate-500">신고 내역이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-slate-700 bg-slate-50">
                      <th className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAllReportGroups}
                          aria-label="전체 선택"
                        />
                      </th>
                      <th className="py-2 pr-3">
                        <button
                          onClick={() => toggleReportSort('session')}
                          className="flex w-full items-center justify-between font-semibold hover:text-slate-900"
                        >
                          <span>원본 회차</span>
                          <span>{sortMark('session')}</span>
                        </button>
                      </th>
                      <th className="py-2 pr-3">원본 문항</th>
                      <th className="py-2 pr-3">
                        <button
                          onClick={() => toggleReportSort('count')}
                          className="flex w-full items-center justify-between font-semibold hover:text-slate-900"
                        >
                          <span>신고 수</span>
                          <span>{sortMark('count')}</span>
                        </button>
                      </th>
                      <th className="py-2 pr-3">
                        <button
                          onClick={() => toggleReportSort('latest')}
                          className="flex w-full items-center justify-between font-semibold hover:text-slate-900"
                        >
                          <span>최근 신고</span>
                          <span>{sortMark('latest')}</span>
                        </button>
                      </th>
                      <th className="py-2 pr-3">회차</th>
                      <th className="py-2">문제 요약</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroupedReports.map((g, gi) => {
                      const isOpen = Boolean(expandedReportGroups[g.key]);
                      const firstReport = g.reports[0];
                      return (
                        <Fragment key={g.key}>
                          <tr key={g.key} className="align-top cursor-pointer" onClick={() => toggleReportGroup(g.key)}>
                            <td
                              className={`py-2 pr-2 whitespace-nowrap border-l border-slate-200 ${
                                isOpen
                                  ? 'bg-sky-50 border-t rounded-tl-lg'
                                  : 'bg-white border-y rounded-l-lg'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(selectedReportGroups[g.key])}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleSelectReportGroup(g.key)}
                                aria-label={`선택 ${g.sourceSessionId}-${g.sourceProblemNumber}`}
                              />
                            </td>
                            <td
                              className={`py-2 pr-3 whitespace-nowrap border-slate-200 ${
                                isOpen ? 'bg-sky-50 border-t' : 'bg-white border-y'
                              }`}
                            >
                              {sessionLabel(g.sourceSessionId)}
                            </td>
                            <td
                              className={`py-2 pr-3 whitespace-nowrap border-slate-200 ${
                                isOpen ? 'bg-sky-50 border-t' : 'bg-white border-y'
                              }`}
                            >
                              {g.sourceProblemNumber}
                            </td>
                            <td
                              className={`py-2 pr-3 whitespace-nowrap font-semibold text-slate-900 border-slate-200 ${
                                isOpen ? 'bg-sky-50 border-t' : 'bg-white border-y'
                              }`}
                            >
                              {g.count}
                            </td>
                            <td
                              className={`py-2 pr-3 whitespace-nowrap border-slate-200 ${
                                isOpen ? 'bg-sky-50 border-t' : 'bg-white border-y'
                              }`}
                            >
                              {fmtTime(g.latestTimestamp)}
                            </td>
                            <td
                              className={`py-2 pr-3 whitespace-nowrap border-slate-200 ${
                                isOpen ? 'bg-sky-50 border-t' : 'bg-white border-y'
                              }`}
                            >
                              {sessionLabel(firstReport?.sessionId || '-')}
                            </td>
                            <td
                              className={`py-2 pr-3 border-r border-slate-200 ${
                                isOpen
                                  ? 'bg-sky-50 border-t rounded-tr-lg'
                                  : 'bg-white border-y rounded-r-lg'
                              }`}
                            >
                              {g.questionText || '-'}
                            </td>
                            
                          </tr>
                          {isOpen && (
                            <tr className="bg-sky-50/40">
                              <td colSpan={7} className="pb-3 pl-6 pr-3 border-x border-b border-slate-200 rounded-b-lg">
                                <div className="rounded-lg bg-white p-3">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-600">개별 신고 이력</p>
                                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
                                      {g.reports.length}건
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-md">
                                    <table className="min-w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-left text-slate-600 bg-white">
                                          <th className="py-1 pr-2">
                                            <label className="inline-flex items-center gap-1">
                                              <input
                                                type="checkbox"
                                                checked={isAllItemsSelectedByGroup(g)}
                                                onChange={() => toggleSelectAllItemsByGroup(g)}
                                                aria-label="상세 전체 선택"
                                              />
                                              <span>전체</span>
                                            </label>
                                          </th>
                                          <th className="py-1 pr-2">
                                            <button
                                              onClick={() => toggleDetailSort(g.key, 'time')}
                                              className="flex w-full items-center justify-between font-semibold hover:text-slate-900"
                                            >
                                              <span>시간</span>
                                              <span>{detailSortMark(g.key, 'time')}</span>
                                            </button>
                                          </th>
                                          <th className="py-1 pr-2">회차</th>
                                          <th className="py-1 pr-2">
                                            <button
                                              onClick={() => toggleDetailSort(g.key, 'problem')}
                                              className="flex w-full items-center justify-between font-semibold hover:text-slate-900"
                                            >
                                              <span>문항</span>
                                              <span>{detailSortMark(g.key, 'problem')}</span>
                                            </button>
                                          </th>
                                          <th className="py-1 pr-2">사유</th>
                                          <th className="py-1">상세</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {getSortedDetailReports(g).map((r, i) => (
                                          <tr key={`${g.key}:${r.timestamp}:${i}`} className="cursor-pointer bg-white hover:bg-slate-50" onClick={() => openDetail(r)}>
                                            <td className="py-1 pr-2 whitespace-nowrap">
                                              <input
                                                type="checkbox"
                                                checked={Boolean(r?.id && selectedReportItems[String(r.id)])}
                                                disabled={!r?.id}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => toggleSelectReportItem(r?.id)}
                                                aria-label={`선택 ${r?.id || i}`}
                                              />
                                            </td>
                                            <td className="py-1 pr-2 whitespace-nowrap">{fmtTime(r.timestamp)}</td>
                                            <td className="py-1 pr-2 whitespace-nowrap">{sessionLabel(r.sessionId)}</td>
                                            <td className="py-1 pr-2 whitespace-nowrap">{r.problemNumber}</td>
                                            <td className="py-1 pr-2">{r.reason}</td>
                                            <td className="py-1">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openDetail(r);
                                                }}
                                                className="px-2 py-1 rounded border border-sky-300 text-sky-700 hover:bg-sky-50 font-semibold"
                                              >
                                                상세
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr aria-hidden className="h-3 bg-white">
                            <td colSpan={7} />
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="최근 14일 방문/완료/합격률 추이" loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="방문" stroke="#0284c7" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="완료" stroke="#0f766e" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="합격률" stroke="#ea580c" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="문제 신고 사유별 건수" loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.reportReasons}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>

      {selectedGptCacheRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={closeGptCacheDetail}>
          <div
            className="w-full max-w-4xl rounded-xl bg-white border border-slate-200 p-5 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-lg font-extrabold text-slate-900">GPT 캐시 상세</h3>
              <button onClick={closeGptCacheDetail} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">닫기</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-4">
              <Info label="과목" value={selectedGptCacheRow.subject ? `${selectedGptCacheRow.subject}과목` : '-'} />
              <Info label="원본 회차" value={sessionLabel(selectedGptCacheRow.sourceSessionId)} />
              <Info label="원본 문항" value={selectedGptCacheRow.sourceProblemNumber} />
              <Info label="생성시각" value={fmtTime(selectedGptCacheRow.createdAt)} />
              <Info label="조회수" value={selectedGptCacheRow.hitCount} />
              <Info label="좋아요" value={selectedGptCacheRow.likeCount} />
              <Info label="싫어요" value={selectedGptCacheRow.dislikeCount} />
              <Info label="캐시 키" value={selectedGptCacheRow.cacheKey || '-'} />
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-700 mb-1">문제 텍스트</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedGptCacheRow.questionText || '-'}</p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-700 mb-1">사용자 질문</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedGptCacheRow.userQuestion || '-'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-1">사용자 선택 정답</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedGptCacheRow.selectedAnswer || '-'}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-semibold text-green-800 mb-1">문제 정답</p>
                  <p className="text-sm text-green-900 whitespace-pre-wrap">{selectedGptCacheRow.correctAnswer || '-'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-sm font-semibold text-indigo-800 mb-1">GPT 답변(캐시)</p>
                <p className="text-sm text-indigo-950 whitespace-pre-wrap">{selectedGptCacheRow.answer || '답변 없음'}</p>
              </div>

              <div className="flex justify-end">
                <a
                  href={`/test/${encodeURIComponent(String(selectedGptCacheRow.sourceSessionId || ''))}?p=${encodeURIComponent(
                    String(selectedGptCacheRow.sourceProblemNumber || '')
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
                >
                  문제 페이지로 이동
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white border border-slate-200 p-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-lg font-extrabold text-slate-900">신고 상세</h3>
              <button onClick={closeDetail} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">닫기</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-4">
              <Info label="시간" value={fmtTime(selectedReport.timestamp)} />
              <Info label="회차" value={selectedReport.sessionId} />
              <Info label="문항" value={selectedReport.problemNumber} />
              <Info
                label="원본"
                value={
                  selectedReport.originSessionId && selectedReport.originProblemNumber
                    ? `${sessionLabel(selectedReport.originSessionId)}-${selectedReport.originProblemNumber}`
                    : '-'
                }
              />
              <Info label="사유" value={selectedReport.reason} />
            </div>

            {detailLoading && <div className="text-slate-500">문제 상세 로딩 중...</div>}
            {detailError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{detailError}</div>}

            {!detailLoading && !detailError && problemDetail && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-indigo-700">{problemDetail.sectionTitle}</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{problemDetail.problemNumber}. {problemDetail.questionText}</p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-2">선택지</p>
                  <ul className="space-y-1 text-sm text-slate-800">
                    {(problemDetail.options || []).map((opt, idx) => (
                      <li key={idx}>{idx + 1}. {opt}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-sm font-semibold text-green-800">정답: {problemDetail.answerText || '-'}</p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-700 mb-1">해설</p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{problemDetail.commentText || '해설 없음'}</p>
                </div>

                <div className="flex justify-end">
                  <a
                    href={problemDetail.gotoPath}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
                  >
                    문제 페이지로 이동
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-3">{k}</td>
      <td className="py-2 pr-3 font-semibold text-slate-900">{v}</td>
    </tr>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value || '-'}</p>
    </div>
  );
}

function ListTable({ title, loading, emptyText, headers, rows }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
      {loading ? (
        <div className="text-slate-500">로딩 중...</div>
      ) : !rows || rows.length === 0 ? (
        <div className="text-slate-500">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                {headers.map((h) => (
                  <th key={h} className="py-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {r.map((cell, j) => (
                    <td key={j} className="py-2 pr-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, loading, children }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <h2 className="font-bold text-slate-900 mb-3">{title}</h2>
      {loading ? <div className="h-[300px] flex items-center justify-center text-slate-500">로딩 중...</div> : children}
    </div>
  );
}
