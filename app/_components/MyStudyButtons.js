'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { BookMarked, HelpCircle, ChevronRight } from 'lucide-react';

export default function MyStudyButtons({ resumeMap = {} }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (s?.user) setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <div className="mb-2 space-y-2">
      {/* 내 틀린 문제 */}
      <Link
        href="/test/my-wrong"
        className="group block rounded-2xl bg-gradient-to-r from-rose-500 to-rose-400 p-5 shadow-md shadow-rose-200/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-200/60"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <BookMarked className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">내 틀린 문제 풀기</h2>
              <p className="text-sm text-rose-100 leading-snug">내가 틀린 문제만 모아서 다시 풀기</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-rose-200 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </Link>
      {resumeMap['my-wrong']?.problemNumber && (
        <Link
          href={`/test/my-wrong?p=${resumeMap['my-wrong'].problemNumber}&resume=1`}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          ↩ 내 오답 이어풀기 {resumeMap['my-wrong'].problemNumber}번
        </Link>
      )}

      {/* 내 모르겠어요 */}
      <Link
        href="/test/my-unknown"
        className="group block rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 p-5 shadow-md shadow-amber-200/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-200/60"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight">내 모르겠어요 문제 풀기</h2>
              <p className="text-sm text-amber-100 leading-snug">모르겠어요를 누른 문제만 모아서 다시 풀기</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-amber-200 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </Link>
      {resumeMap['my-unknown']?.problemNumber && (
        <Link
          href={`/test/my-unknown?p=${resumeMap['my-unknown'].problemNumber}&resume=1`}
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
        >
          ↩ 내 모르겠어요 이어풀기 {resumeMap['my-unknown'].problemNumber}번
        </Link>
      )}
    </div>
  );
}
