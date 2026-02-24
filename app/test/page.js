'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, Gift, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';
import { readUnknownProblems } from '@/lib/unknownProblemsStore';

const RESUME_STATE_KEY_PREFIX = 'quiz_resume_state_';
const PATCH_REWARD_VERSION = '2025-industrial-fix-reward-v1';
const PATCH_REWARD_STORAGE_KEY = `patch_reward_claimed_${PATCH_REWARD_VERSION}`;

const patchRewardFireworks = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: 4 + ((i * 11) % 92),
  drift: (i % 2 === 0 ? 1 : -1) * (14 + ((i * 7) % 36)),
  rise: 180 + ((i * 17) % 260),
  delay: (i % 12) * 0.07,
  duration: 1.3 + ((i * 13) % 10) * 0.07,
  size: 5 + (i % 5),
  color: ['#38bdf8', '#22c55e', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6'][i % 6],
}));

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

export default function TestSelectionPage() {
  const [resumeMap, setResumeMap] = useState({});
  const [unknownProblems, setUnknownProblems] = useState([]);
  const [showPatchRewardModal, setShowPatchRewardModal] = useState(false);
  const [showPatchRewardToast, setShowPatchRewardToast] = useState(false);
  const [showPatchFireworks, setShowPatchFireworks] = useState(false);

  const refreshClientStoredState = () => {
    const allSessionIds = [
      'random',
      'high-wrong',
      'high-unknown',
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
    setUnknownProblems(readUnknownProblems());
  };

  useEffect(() => {
    const key = `visit_test_${new Date().toISOString().slice(0, 10)}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    trackEvent('visit_test', { path: '/test' });
  }, []);

  useEffect(() => {
    refreshClientStoredState();
    const onFocus = () => refreshClientStoredState();
    const onStorage = () => refreshClientStoredState();
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(PATCH_REWARD_STORAGE_KEY)) {
        setShowPatchRewardModal(true);
      }
    } catch {}
  }, []);

  // 패치 보상 1회 수령 처리 후 축하 토스트/폭죽 애니메이션 실행
  const handleClaimPatchReward = () => {
    try {
      window.localStorage.setItem(PATCH_REWARD_STORAGE_KEY, new Date().toISOString());
    } catch {}
    setShowPatchRewardModal(false);
    setShowPatchRewardToast(true);
    setShowPatchFireworks(true);
    window.setTimeout(() => setShowPatchRewardToast(false), 2200);
    window.setTimeout(() => setShowPatchFireworks(false), 5000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800">
      {showPatchRewardModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 px-4">
          <div className="w-full max-w-md rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-700">패치 보상 안내</p>
                <h2 className="text-lg font-extrabold text-slate-900">2025년도 기출문제 패치</h2>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-700">
              2025년도 기출문제 패치 기다려주신 여러분 감사합니다
            </p>

            <div className="my-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-amber-300 bg-gradient-to-br from-yellow-200 via-amber-300 to-amber-500 shadow-inner">
                  <span className="text-xs font-black tracking-wide text-amber-900">TOKEN</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-700">패치 보상</p>
                  <p className="text-xl font-extrabold text-amber-900">+ 2000 Token 지급 !</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimPatchReward}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-sky-700"
            >
              받기
            </button>
          </div>
        </div>
      )}

      {showPatchRewardToast && (
        <div className="pointer-events-none fixed inset-x-0 top-5 z-[130] flex justify-center px-4">
          <div className="rounded-full border border-emerald-200 bg-white px-5 py-3 shadow-xl">
            <p className="text-sm font-extrabold text-emerald-700">포인트획득 !</p>
          </div>
        </div>
      )}

      {showPatchFireworks && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[125] h-80 overflow-hidden">
          {patchRewardFireworks.map((particle) => (
            <span
              key={particle.id}
              className="patch-firework-particle"
              style={{
                left: `${particle.left}%`,
                width: `${particle.size}px`,
                height: `${particle.size * 2.6}px`,
                background: `linear-gradient(to top, ${particle.color}, rgba(255,255,255,0.95))`,
                '--drift': `${particle.drift}px`,
                '--rise': `${particle.rise}px`,
                '--delay': `${particle.delay}s`,
                '--dur': `${particle.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-sky-900 tracking-tight">모의시험 회차 선택</h1>
            <p className="mt-4 text-lg text-gray-600">원하는 회차를 선택하여 실전처럼 연습을 시작하세요.</p>
          </div>

          <div className="mb-4 space-y-2">
            <Link
              href="/test/high-wrong"
              className="block p-5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">오답률 높은 문제 풀기</h2>
                    <p className="text-sm text-white/90">문항별 오답률 집계 기반 재풀이 모드</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['high-wrong']?.problemNumber && (
              <Link
                href={`/test/high-wrong?p=${resumeMap['high-wrong'].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-sm font-bold text-rose-800 hover:bg-rose-100"
              >
                오답률 모드 이어풀기 {resumeMap['high-wrong'].problemNumber}번
              </Link>
            )}

            <Link
              href="/test/high-unknown"
              className="block p-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">모르겠어요 많이 누른 문제 풀기</h2>
                    <p className="text-sm text-white/90">문항별 모르겠어요 비율 집계 기반 재풀이 모드</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap['high-unknown']?.problemNumber && (
              <Link
                href={`/test/high-unknown?p=${resumeMap['high-unknown'].problemNumber}&resume=1`}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1 text-sm font-bold text-violet-800 hover:bg-violet-100"
              >
                모르겠어요 모드 이어풀기 {resumeMap['high-unknown'].problemNumber}번
              </Link>
            )}

            <Link
              href="/test/random"
              className="block p-5 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <h2 className="text-lg font-bold">랜덤풀기</h2>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
            {resumeMap.random?.problemNumber && resumeMap.random?.resumeToken && (
              <Link
                href={`/test/random?p=${resumeMap.random.problemNumber}&resume=1&seed=${encodeURIComponent(resumeMap.random.resumeToken)}`}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-bold text-indigo-800 hover:bg-indigo-100"
              >
                랜덤 이어풀기 {resumeMap.random.problemNumber}번
              </Link>
            )}
          </div>

          <Link
            href="/test/random22"
            className="mb-4 block p-5 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shuffle className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">랜덤보기22 (문제 셔플형)</h2>
                  <p className="text-sm text-white/90">2022 / 2023 / 2024 / 2025 선택 후 진행</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href="/test/100"
            className="mb-6 block p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shuffle className="w-6 h-6" />
                <h2 className="text-lg font-bold">100문제 풀어보기</h2>
              </div>
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>

          {unknownProblems.length > 0 && (
            <Link
              href="/test/unknown"
              className="mb-6 block p-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-6 h-6" />
                  <div>
                    <h2 className="text-lg font-bold">모르겠어요 다시 풀기</h2>
                    <p className="text-sm text-white/90">{unknownProblems.length}문제 대기 중</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          )}

          <div className="space-y-4">
            {sessionsByYear.map((yearGroup) => (
              <details
                key={yearGroup.year}
                className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 open:border-sky-300"
                open={yearGroup.year === 'Now' || yearGroup.year === 2025 || yearGroup.year === 2024}
              >
                <summary className="list-none cursor-pointer p-6 md:p-7 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-sky-100 rounded-xl">
                      <Book className="w-6 h-6 text-sky-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-sky-900">
                      {typeof yearGroup.year === 'number' ? `${yearGroup.year}년` : `${yearGroup.year} 세트`}
                    </h2>
                  </div>
                  <ChevronRight className="w-7 h-7 text-gray-400" />
                </summary>

                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
                  {yearGroup.sessions.map((session) => {
                    const resume = resumeMap[String(session.id)];
                    const targetHref = String(session.id).startsWith('pdfpack-')
                      ? `/test/pdf-pack/${String(session.id).slice('pdfpack-'.length)}/quiz`
                      : `/test/${session.id}`;
                    const resumeHref = String(session.id).startsWith('pdfpack-')
                      ? `/test/pdf-pack/${String(session.id).slice('pdfpack-'.length)}/quiz?p=${resume?.problemNumber}&resume=1`
                      : `/test/${session.id}?p=${resume?.problemNumber}&resume=1`;
                    return (
                      <div key={session.id} className="space-y-2">
                        <Link
                          href={targetHref}
                          className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-sky-900">{session.title}</h3>
                              <p className="text-gray-600 mt-1">{session.description}</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400" />
                          </div>
                        </Link>
                        {resume && (
                          <Link
                            href={resumeHref}
                            className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-bold text-indigo-800 hover:bg-indigo-100"
                          >
                            이어풀기 {resume.problemNumber}번
                          </Link>
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

      <style jsx>{`
        .patch-firework-particle {
          position: absolute;
          bottom: -16px;
          border-radius: 9999px;
          opacity: 0;
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.75));
          animation: patch-firework-rise var(--dur) ease-out var(--delay) forwards;
        }

        @keyframes patch-firework-rise {
          0% {
            transform: translate3d(0, 0, 0) scale(0.65);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift), calc(var(--rise) * -1), 0) scale(1.05);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
