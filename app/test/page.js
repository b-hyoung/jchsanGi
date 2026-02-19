'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Book, ChevronRight, Shuffle } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';

const sessionsByYear = [
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
];

export default function TestSelectionPage() {
  useEffect(() => {
    const key = `visit_test_${new Date().toISOString().slice(0, 10)}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    trackEvent('visit_test', { path: '/test' });
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-sky-900 tracking-tight">모의시험 회차 선택</h1>
            <p className="mt-4 text-lg text-gray-600">원하는 회차를 선택하여 실전처럼 연습을 시작하세요.</p>
          </div>

          <Link
            href="/test/random"
            className="mb-4 block p-5 bg-gradient-to-r from-indigo-500 to-sky-500 text-white rounded-2xl shadow-lg hover:opacity-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shuffle className="w-6 h-6" />
                <h2 className="text-lg font-bold">랜덤풀기</h2>
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

          <div className="space-y-4">
            {sessionsByYear.map((yearGroup) => (
              <details
                key={yearGroup.year}
                className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 open:border-sky-300"
                open={yearGroup.year === 2024}
              >
                <summary className="list-none cursor-pointer p-6 md:p-7 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-sky-100 rounded-xl">
                      <Book className="w-6 h-6 text-sky-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-sky-900">{yearGroup.year}년</h2>
                  </div>
                  <ChevronRight className="w-7 h-7 text-gray-400" />
                </summary>

                <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
                  {yearGroup.sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/test/${session.id}`}
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
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
