'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlayCircle } from 'lucide-react';

const FAIL_QUOTES = [
  '이터널 리턴.. 조금만 할까?',
  '시험 며칠 안 남았는데 이 점수?\n앞에 창문 열고 뛰어내리자.',
  '과락 ㅋㅋㅋㅋㅋㅋ\n숨참고 한강 다이브~',
  '증바람 한판하고 뛰어내릴까?.',
];

export function UpdateNoticeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 md:p-7">
        <h2 className="text-xl md:text-2xl font-extrabold text-sky-900 mb-4">업데이트 안내</h2>
        <div className="space-y-2 text-sm md:text-base text-gray-700">
          <p>사용자 편의성 개선 사항이 적용되었습니다.</p>
          <p>문제 네비게이션(1~60)에서 O / X / ? 상태를 바로 확인할 수 있습니다.</p>
          <p>좌측 상단 설정(톱니)에서 정답 확인 사용을 켜고 끌 수 있습니다.</p>
          <p>키보드만으로 진행할 수 있습니다: 1~4 선택, Enter/Space 정답확인/다음.</p>
          <p>정답확인/다음 버튼은 문제 컨테이너 오른쪽 아래로 이동했습니다.</p>
          <p>종료 시 확인 후 현재 점수를 보여주고 회차 선택으로 이동합니다.</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestLobby({ session, onStart, problemCount, labels }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl text-center">
        <Link href="/test" className="inline-flex items-center text-gray-600 hover:text-indigo-700 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          {labels.backToSession}
        </Link>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200/50">
          <p className="text-indigo-600 font-semibold">{labels.lobbyTitle}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 mb-4">{session.title}</h1>
          <p className="text-gray-700 mb-8">총 {problemCount}문항 / 90분(3과목)</p>
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 md:flex-row">
            <button
              onClick={onStart}
              className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 inline-flex items-center justify-center"
            >
              <PlayCircle className="w-6 h-6 mr-3" />
              {labels.start}
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            시작 후 좌측 상단 <span className="font-semibold">설정(톱니)</span>에서
            <span className="font-semibold"> 정답 확인 사용</span>을 켜고 끌 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuizResults({ session, results, onRetryWrong, onRetryUnknown, labels }) {
  const {
    totalCorrect,
    wrongCount,
    unknownCount = 0,
    subjectCorrectCounts,
    subjectTotalCounts,
    subjectPassFail,
    isOverallPass,
    isRetryMode,
    elapsedSeconds = 0,
  } = results;
  const [showFailModal, setShowFailModal] = useState(!isRetryMode && !isOverallPass);
  const [failQuote] = useState(() => FAIL_QUOTES[Math.floor(Math.random() * FAIL_QUOTES.length)]);
  const safeElapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const elapsedH = String(Math.floor(safeElapsed / 3600)).padStart(2, '0');
  const elapsedM = String(Math.floor((safeElapsed % 3600) / 60)).padStart(2, '0');
  const elapsedS = String(Math.floor(safeElapsed % 60)).padStart(2, '0');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl text-center">
        <Link href="/test" className="inline-flex items-center text-gray-600 hover:text-indigo-700 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          {labels.backToSession}
        </Link>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200/50">
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 mb-2">{session.title}</h1>
          {isRetryMode && (
            <p className="text-base md:text-lg font-semibold text-indigo-700 mb-2">오답 재풀이 결과</p>
          )}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {labels.score}: {totalCorrect} / 60
            </h2>
            <p className="text-sm md:text-base font-semibold text-gray-600 mb-2">
              푸는데 걸린 시간: {elapsedH}:{elapsedM}:{elapsedS}
            </p>
            <p className={`text-3xl font-extrabold ${isOverallPass ? 'text-green-600' : 'text-red-600'}`}>
              {isOverallPass ? labels.pass : labels.fail}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-lg">
            {[1, 2, 3].map((subjectNum) => (
              <div
                key={subjectNum}
                className={`p-4 rounded-lg border-2 ${subjectPassFail[subjectNum] ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}
              >
                <p className="font-semibold text-gray-700">{labels.subject} {subjectNum}</p>
                <p className="text-xl font-bold text-gray-900">
                  {subjectCorrectCounts[subjectNum]} / {subjectTotalCounts?.[subjectNum] ?? 20} {labels.qCount}
                </p>
                <p className={`font-semibold ${subjectPassFail[subjectNum] ? 'text-green-600' : 'text-red-600'}`}>
                  {subjectPassFail[subjectNum] ? labels.avoidFail : labels.failSubject}
                </p>
              </div>
            ))}
          </div>
          {wrongCount > 0 && (
            <button
              onClick={onRetryWrong}
              className="w-full max-w-xs mx-auto mb-4 px-8 py-3 bg-amber-500 text-white font-bold rounded-full hover:bg-amber-600 transition inline-flex items-center justify-center"
            >
              틀린문제만 다시 풀기 ({wrongCount})
            </button>
          )}
          {unknownCount > 0 && (
            <button
              onClick={onRetryUnknown}
              className="w-full max-w-xs mx-auto mb-4 px-8 py-3 bg-sky-500 text-white font-bold rounded-full hover:bg-sky-600 transition inline-flex items-center justify-center"
            >
              {labels.unknownRetry} ({unknownCount})
            </button>
          )}
          <Link
            href="/test"
            className="w-full max-w-xs mx-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 inline-flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 mr-3" />
            {labels.chooseOther}
          </Link>
        </div>
      </div>
      {!isRetryMode && !isOverallPass && showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 text-center">
            <p className="text-lg font-bold text-gray-800 mb-5 whitespace-pre-line">{failQuote}</p>
            <button
              onClick={() => setShowFailModal(false)}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
            >
              깝치지 말고 틀린문제 다시풀러가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
