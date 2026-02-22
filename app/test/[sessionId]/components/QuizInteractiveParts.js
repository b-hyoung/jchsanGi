'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';

export function QuizSettingsPopover({
  isOpen,
  onClose,
  labels,
  enableAnswerCheck,
  onChangeEnableAnswerCheck,
  showExplanationWhenCorrect,
  onChangeShowExplanationWhenCorrect,
  showExplanationWhenIncorrect,
  onChangeShowExplanationWhenIncorrect,
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-20">
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-gray-900">{labels.settings}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="설정 닫기"
        >
          X
        </button>
      </div>
      <div className="space-y-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableAnswerCheck}
            onChange={(e) => onChangeEnableAnswerCheck(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">{labels.enableCheck}</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExplanationWhenCorrect}
            onChange={(e) => onChangeShowExplanationWhenCorrect(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">{labels.showCorrect}</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExplanationWhenIncorrect}
            onChange={(e) => onChangeShowExplanationWhenIncorrect(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">{labels.showWrong}</span>
        </label>
      </div>
    </div>
  );
}

export function GptHelpSection({
  isGptUsedForCurrent,
  hasAssistantReplyForCurrent,
  showGptHelp,
  gptQuestion,
  onChangeGptQuestion,
  onAskGpt,
  gptLoading,
  gptMessages,
  gptError,
  hasSavedGptForCurrent,
  onOpenGptView,
  onOpenGptChat,
  gptMaxTurns,
}) {
  return (
    <div className="mt-4 border-t pt-4">
      <button
        type="button"
        onClick={onOpenGptView}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed"
      >
        GPT 해설보기
      </button>
      {isGptUsedForCurrent && !hasAssistantReplyForCurrent && (
        <p className="mt-2 text-xs font-semibold text-gray-600">
          이 문제의 GPT 이의신청은 1회만 가능합니다.
        </p>
      )}

      {showGptHelp && (
        <div className="mt-3 space-y-3 rounded-lg border border-sky-200 bg-white p-3">
          <textarea
            value={gptQuestion}
            onChange={(e) => onChangeGptQuestion(e.target.value)}
            placeholder="추가로 궁금한 점을 적어주세요. (선택)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-sky-500"
            rows={3}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onAskGpt}
              disabled={gptLoading || gptMessages.filter((m) => m.role === 'user').length >= gptMaxTurns}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {gptLoading ? 'GPT 답변 생성 중...' : 'GPT에게 물어보기'}
            </button>
          </div>

          {gptError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {gptError}
            </p>
          )}

          {(gptMessages.length > 0 || hasSavedGptForCurrent) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onOpenGptChat}
                className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100"
              >
                GPT 설명 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GptChatModal({
  isOpen,
  onClose,
  gptMessages,
  gptVoteMap,
  onVoteGpt,
  gptMaxTurns,
  gptQuestion,
  onChangeGptQuestion,
  onAskGpt,
  gptLoading,
  gptError,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 md:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
          <h3 className="text-base md:text-lg font-extrabold text-sky-900">GPT 이의신청 대화</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
          >
            닫기
          </button>
        </div>

        <div className="max-h-[48vh] overflow-y-auto space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {gptMessages.length === 0 ? (
            <p className="text-sm text-gray-500">아직 대화가 없습니다.</p>
          ) : (
            gptMessages.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'ml-8 bg-indigo-100 text-indigo-900'
                    : 'mr-8 bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <p className="mb-1 text-xs font-bold opacity-70">{m.role === 'user' ? '나' : 'GPT'}</p>
                <p>{m.content}</p>
                {m.role === 'assistant' && m.cached && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                    이전에 나눈 대화를 통한 해석(캐시)
                  </p>
                )}
                {m.role === 'assistant' && (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {m.cacheKey && gptVoteMap[String(m.cacheKey)] && (
                      <span className="text-[11px] font-semibold text-gray-500">평가 완료</span>
                    )}
                    <button
                      type="button"
                      disabled={!m.cacheKey || Boolean(gptVoteMap[String(m.cacheKey)])}
                      onClick={() => onVoteGpt(idx, 'up')}
                      className="inline-flex h-8 min-w-[56px] items-center justify-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {Number(m?.feedback?.like || 0)}
                    </button>
                    <button
                      type="button"
                      disabled={!m.cacheKey || Boolean(gptVoteMap[String(m.cacheKey)])}
                      onClick={() => onVoteGpt(idx, 'down')}
                      className="inline-flex h-8 min-w-[56px] items-center justify-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      {Number(m?.feedback?.dislike || 0)}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold text-gray-600">
            대화 {gptMessages.filter((m) => m.role === 'user').length} / {gptMaxTurns}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={gptQuestion}
              onChange={(e) => onChangeGptQuestion(e.target.value)}
              placeholder="추가 질문 입력"
              className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={onAskGpt}
              disabled={gptLoading || gptMessages.filter((m) => m.role === 'user').length >= gptMaxTurns}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              {gptLoading ? '생성 중...' : '전송'}
            </button>
          </div>
          {gptError && <p className="mt-2 text-xs font-semibold text-red-600">{gptError}</p>}
        </div>
      </div>
    </div>
  );
}

export function GptLoadingOverlay({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-indigo-200 bg-white/95 p-5 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-base font-bold text-indigo-900">GPT 해설 생성 중...</p>
        <p className="mt-1 text-sm text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}

export function ReportTipToast({ isOpen, countdown }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
      <div className="mt-4 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 p-4 text-center animate-in fade-in slide-in-from-top-2 duration-300">
        <p className="text-base md:text-lg font-bold text-gray-800 leading-relaxed">
          문제에 버그가 있다면 화면 하단의
          <br />
          신고하기로 제보해주세요.
        </p>
        <p className="mt-2 text-sm font-semibold text-amber-700">
          {countdown <= 3 ? `${countdown}초 후 닫힙니다.` : '잠시 후 자동으로 닫힙니다.'}
        </p>
      </div>
    </div>
  );
}
