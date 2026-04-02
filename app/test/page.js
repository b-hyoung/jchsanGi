'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import UserQuickActions from '@/app/_components/UserQuickActions';
import MyStudyButtons from '@/app/_components/MyStudyButtons';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';

const sessionsByYear = [
  {
    year: 'Now',
    sessions: [
      { id: 12, title: '따끈 문제 60', description: '개발자가 방금 만든 신규 60문제 세트입니다.' },
    ],
  },
  {
    year: 2025,
    sessions: [
      { id: 'pdfpack-industrial-2025-1', title: '1회', description: '2025년 1회 정보처리산업기사 필기 문제입니다.' },
      { id: 'pdfpack-industrial-2025-2', title: '2회', description: '2025년 2회 정보처리산업기사 필기 문제입니다.' },
      { id: 'pdfpack-industrial-2025-3', title: '3회', description: '2025년 3회 정보처리산업기사 필기 문제입니다.' },
    ],
  },
  {
    year: 2024,
    sessions: [
      { id: 1, title: '1회', description: '2024년 1회 기출문제입니다.' },
      { id: 4, title: '2회', description: '2024년 2회 기출문제입니다.' },
      { id: 5, title: '3회', description: '2024년 3회 기출문제입니다.' },
    ],
  },
  {
    year: 2023,
    sessions: [
      { id: 6, title: '1회', description: '2023년 1회 기출문제입니다.' },
      { id: 7, title: '2회', description: '2023년 2회 기출문제입니다.' },
      { id: 8, title: '3회', description: '2023년 3회 기출문제입니다.' },
    ],
  },
  {
    year: 2022,
    sessions: [
      { id: 9, title: '1회', description: '2022년 1회 기출문제입니다.' },
      { id: 10, title: '2회', description: '2022년 2회 기출문제입니다.' },
      { id: 11, title: '3회', description: '2022년 3회 기출문제입니다.' },
    ],
  },
  {
    year: '실기',
    sessions: [
      {
        id: 'practical-industrial-2022-1',
        title: '2022년 1회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2022-2',
        title: '2022년 2회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2022-3',
        title: '2022년 3회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2023-1',
        title: '2023년 1회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2023-2',
        title: '2023년 2회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2023-3',
        title: '2023년 3회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2024-1',
        title: '2024년 1회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2024-2',
        title: '2024년 2회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
      {
        id: 'practical-industrial-2024-3',
        title: '2024년 3회',
        description: '정보처리산업기사 실기 문제 제작용 세트입니다. (해설 미작성)',
      },
    ],
  },
];

const writtenSessionsByYear = sessionsByYear.filter((group) => group.year !== '실기' && group.year !== 'Now');

function ModeButton({ href, gradient, shadow, icon, title, desc }) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-2xl bg-gradient-to-r ${gradient} p-4 shadow-md ${shadow} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
          {icon}
        </div>
        <div>
          <p className="text-sm font-extrabold text-white leading-tight">{title}</p>
          <p className="text-xs text-white/80 leading-snug mt-0.5">{desc}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/60 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-white" />
    </Link>
  );
}

const resumeChipColors = {
  rose: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
};

function ResumeChip({ href, color = 'indigo', children }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold transition ${resumeChipColors[color]}`}
    >
      ↩ {children}
    </Link>
  );
}

export default function TestSelectionPage() {
  const [resumeMap, setResumeMap] = useState({});

  const refreshClientStoredState = () => {
    const allSessionIds = [
      'random',
      'high-wrong',
      'high-unknown',
      'my-wrong',
      'my-unknown',
      'random22',
      'random22-2022',
      'random22-2023',
      'random22-2024',
      'random22-2025',
      '100',
      ...sessionsByYear.flatMap((group) => group.sessions.map((session) => String(session.id))),
    ];
    const nextMap = {};
    for (const id of allSessionIds) {
      try {
        const raw = window.localStorage.getItem(`${RESUME_STATE_KEY_PREFIX}${id}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const problemNumber = Number(parsed?.problemNumber);
        if (Number.isNaN(problemNumber) || problemNumber <= 0) continue;
        nextMap[id] = { problemNumber, resumeToken: String(parsed?.resumeToken || '') };
      } catch {}
    }
    setResumeMap(nextMap);
  };

  useEffect(() => {
    const key = `visit_test_${new Date().toISOString().slice(0, 10)}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    trackEvent('visit_test', { path: '/test' });
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      refreshClientStoredState();
    }, 0);
    const onFocus = () => refreshClientStoredState();
    const onStorage = () => refreshClientStoredState();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 via-white to-slate-50 text-gray-800">
      <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">

        {/* 상단 네비 */}
        <UserQuickActions className="mb-5" />
        <div className="mb-6">
          <Link
            href="/exam"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            필기/실기 선택으로 돌아가기
          </Link>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-sky-900 md:text-4xl">모의시험 회차 선택</h1>
          <p className="mt-1.5 text-sm text-slate-500">원하는 회차를 선택하여 실전처럼 연습하세요.</p>
        </div>

        {/* ── 섹션 1: 내 학습 (로그인 시 노출) ── */}
        <MyStudyButtons resumeMap={resumeMap} />

        {/* ── 섹션 2: 특수 모드 ── */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">특수 모드</p>
          </div>
          <div className="p-4 space-y-2">
            <ModeButton
              href="/test/high-wrong"
              gradient="from-rose-500 to-orange-400"
              shadow="shadow-rose-200/50"
              icon={<Shuffle className="w-5 h-5 text-white" />}
              title="오답률 높은 문제 풀기"
              desc="전체 통계 기반 오답률 상위 문제 모음"
            />
            {resumeMap['high-wrong']?.problemNumber && (
              <ResumeChip href={`/test/high-wrong?p=${resumeMap['high-wrong'].problemNumber}&resume=1`} color="rose">
                오답률 모드 이어풀기 {resumeMap['high-wrong'].problemNumber}번
              </ResumeChip>
            )}

            <ModeButton
              href="/test/high-unknown"
              gradient="from-violet-500 to-fuchsia-400"
              shadow="shadow-violet-200/50"
              icon={<Shuffle className="w-5 h-5 text-white" />}
              title="모르겠어요 많이 누른 문제 풀기"
              desc="전체 통계 기반 모르겠어요 비율 상위 모음"
            />
            {resumeMap['high-unknown']?.problemNumber && (
              <ResumeChip href={`/test/high-unknown?p=${resumeMap['high-unknown'].problemNumber}&resume=1`} color="violet">
                모르겠어요 모드 이어풀기 {resumeMap['high-unknown'].problemNumber}번
              </ResumeChip>
            )}

          </div>
        </div>

        {/* ── 섹션 3: 랜덤 / 100문제 ── */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">랜덤 / 종합</p>
          </div>
          <div className="p-4 space-y-2">
            <ModeButton
              href="/test/random"
              gradient="from-indigo-500 to-sky-400"
              shadow="shadow-indigo-200/50"
              icon={<Shuffle className="w-5 h-5 text-white" />}
              title="랜덤풀기"
              desc="전 회차에서 무작위로 출제"
            />
            {resumeMap.random?.problemNumber && resumeMap.random?.resumeToken && (
              <ResumeChip href={`/test/random?p=${resumeMap.random.problemNumber}&resume=1&seed=${encodeURIComponent(resumeMap.random.resumeToken)}`} color="indigo">
                랜덤 이어풀기 {resumeMap.random.problemNumber}번
              </ResumeChip>
            )}

            <ModeButton
              href="/test/random22"
              gradient="from-fuchsia-500 to-violet-400"
              shadow="shadow-fuchsia-200/50"
              icon={<Shuffle className="w-5 h-5 text-white" />}
              title="랜덤보기22 (문제 셔플형)"
              desc="2022 / 2023 / 2024 / 2025 연도 선택 후 진행"
            />

            <ModeButton
              href="/test/100"
              gradient="from-emerald-500 to-teal-400"
              shadow="shadow-emerald-200/50"
              icon={<Shuffle className="w-5 h-5 text-white" />}
              title="100문제 풀어보기"
              desc="엄선된 100문제 종합 세트"
            />
          </div>
        </div>

        {/* ── 섹션 4: 연도별 회차 ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">연도별 기출</p>
          </div>
          <div className="divide-y divide-slate-100">
            {writtenSessionsByYear.map((yearGroup) => (
              <details
                key={yearGroup.year}
                className="group"
                open={yearGroup.year === 2025 || yearGroup.year === 2024}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 select-none hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
                      <Book className="h-4 w-4 text-sky-600" />
                    </div>
                    <span className="text-base font-bold text-sky-900">
                      {typeof yearGroup.year === 'number' ? `${yearGroup.year}년` : `${yearGroup.year} 세트`}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition-transform duration-200 group-open:rotate-90" />
                </summary>

                <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-4 pt-3 space-y-2">
                  {yearGroup.sessions.map((session) => {
                    const resume = resumeMap[String(session.id)];
                    const sessionIdText = String(session.id);
                    const isPdfPack = sessionIdText.startsWith('pdfpack-');
                    const isPractical = sessionIdText.startsWith('practical-industrial-');
                    const targetHref = isPdfPack
                      ? `/test/pdf-pack/${sessionIdText.slice('pdfpack-'.length)}/quiz`
                      : isPractical
                        ? `/practical/${sessionIdText}`
                        : `/test/${sessionIdText}`;
                    const resumeHref = isPdfPack
                      ? `/test/pdf-pack/${sessionIdText.slice('pdfpack-'.length)}/quiz?p=${resume?.problemNumber}&resume=1`
                      : isPractical
                        ? `/practical/${sessionIdText}?resume=1`
                        : `/test/${sessionIdText}?p=${resume?.problemNumber}&resume=1`;
                    return (
                      <div key={session.id} className="space-y-1.5">
                        <Link
                          href={targetHref}
                          className="group/item flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-sky-300 hover:bg-sky-50"
                        >
                          <div>
                            <p className="text-sm font-bold text-sky-900">{session.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{session.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-sky-400" />
                        </Link>
                        {resume && (
                          <ResumeChip href={resumeHref} color="indigo">
                            이어풀기 {resume.problemNumber}번
                          </ResumeChip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
