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
};

const ADMIN_PASSWORD = 'testbob';
const ADMIN_AUTH_KEY = 'admin_auth_ok';

const LIST_TABS = [
  { key: 'kpi', label: '요약 리스트' },
  { key: 'daily', label: '일자별 리스트' },
  { key: 'session', label: '회차별 리스트' },
  { key: 'subject', label: '과목별 리스트' },
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
  '100': '100문제 모드',
};

function sessionLabel(sessionId) {
  const key = String(sessionId || '').trim();
  return SESSION_LABELS[key] || key || '-';
}

function fmtTime(ts) {
  return String(ts || '').replace('T', ' ').slice(0, 19);
}

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

  useEffect(() => {
    const ok = window.sessionStorage.getItem(ADMIN_AUTH_KEY) === '1';
    if (ok) {
      setUnlocked(true);
      load();
    } else {
      setLoading(false);
    }
  }, []);

  const kpis = useMemo(() => metrics.kpis ?? emptyMetrics.kpis, [metrics]);
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

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        reports: g.reports.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || ''))),
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return String(b.latestTimestamp || '').localeCompare(String(a.latestTimestamp || ''));
      });
  }, [metrics.recentReports]);

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

  const toggleReportGroup = (key) => {
    setExpandedReportGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openDetail = async (report) => {
    setSelectedReport(report);
    setProblemDetail(null);
    setDetailError('');
    setDetailLoading(true);

    const sid = String(report?.originSessionId || report?.sessionId || '').trim();
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

        {tab === 'reports' && (
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-3">신고 리스트 (클릭하면 상세 확인)</h2>
            {loading ? (
              <div className="text-slate-500">로딩 중...</div>
            ) : groupedReports.length === 0 ? (
              <div className="text-slate-500">신고 내역이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-3">원본 회차</th>
                      <th className="py-2 pr-3">원본 문항</th>
                      <th className="py-2 pr-3">신고 수</th>
                      <th className="py-2 pr-3">최근 신고</th>
                      <th className="py-2 pr-3">회차</th>
                      <th className="py-2">문제 요약</th>
                      <th className="py-2 pr-3">상세보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedReports.map((g) => {
                      const isOpen = Boolean(expandedReportGroups[g.key]);
                      const firstReport = g.reports[0];
                      return (
                        <Fragment key={g.key}>
                          <tr
                            key={g.key}
                            className="border-b border-slate-100 align-top hover:bg-slate-50 cursor-pointer"
                            onClick={() => openDetail(firstReport)}
                          >
                            <td className="py-2 pr-3 whitespace-nowrap">{sessionLabel(g.sourceSessionId)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{g.sourceProblemNumber}</td>
                            <td className="py-2 pr-3 whitespace-nowrap font-semibold text-slate-900">{g.count}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{fmtTime(g.latestTimestamp)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">{sessionLabel(firstReport?.sessionId || '-')}</td>
                            <td className="py-2">{g.questionText || '-'}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReportGroup(g.key);
                                }}
                                className="h-8 w-8 rounded-md border border-slate-300 hover:bg-slate-50 font-semibold inline-flex items-center justify-center"
                                aria-label={isOpen ? '접기' : '펼치기'}
                                title={isOpen ? '접기' : '펼치기'}
                              >
                                {'▾'}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                              <td colSpan={7} className="py-3 pl-6 pr-3">
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <p className="text-xs font-semibold text-slate-500 mb-2">개별 신고 이력</p>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-left text-slate-500">
                                          <th className="py-1 pr-2">시간</th>
                                          <th className="py-1 pr-2">회차</th>
                                          <th className="py-1 pr-2">문항</th>
                                          <th className="py-1 pr-2">사유</th>
                                          <th className="py-1">상세</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {g.reports.map((r, i) => (
                                          <tr
                                            key={`${g.key}:${r.timestamp}:${i}`}
                                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                                            onClick={() => openDetail(r)}
                                          >
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
