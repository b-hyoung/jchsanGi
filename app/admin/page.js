'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">어드민 대시보드</h1>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
          >
            새로고침
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="방문자 수" value={kpis.visitors} />
          <KpiCard title="완주 사용자" value={kpis.completedUsers} />
          <KpiCard title="완주율" value={`${kpis.completionRate}%`} />
          <KpiCard title="전체 합격률" value={`${kpis.passRate}%`} />
        </div>

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

          <ChartCard title="퍼널 (방문 > 시작 > 완료 > 합격)" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.funnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="회차별 시작/완료/합격률" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.sessionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="시작" fill="#38bdf8" />
                <Bar dataKey="완료" fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="과목별 평균 정답률" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={metrics.subjectAverages}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="정답률" dataKey="정답률" stroke="#0284c7" fill="#38bdf8" fillOpacity={0.5} />
                <Tooltip />
              </RadarChart>
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

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">최근 문제 신고</h2>
          {loading ? (
            <div className="text-slate-500">로딩 중...</div>
          ) : metrics.recentReports.length === 0 ? (
            <div className="text-slate-500">신고 내역이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-3">시간</th>
                    <th className="py-2 pr-3">회차</th>
                    <th className="py-2 pr-3">문항</th>
                    <th className="py-2 pr-3">신고 사유</th>
                    <th className="py-2">문제 요약</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentReports.map((r, idx) => (
                    <tr key={`${r.timestamp}_${idx}`} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{String(r.timestamp || '').replace('T', ' ').slice(0, 19)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.sessionId}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.problemNumber}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.reason}</td>
                      <td className="py-2">{r.questionText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
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
