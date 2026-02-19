'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { trackEvent } from '@/lib/analyticsClient';

const T = {
  loadFail: '문제를 불러오는 데 실패했습니다.',
  needSelect: '답을 선택해주세요.',
  problem: '문제',
  settings: '해설 설정',
  showCorrect: '정답일 때 해설 보기',
  showWrong: '오답일 때 해설 보기',
  end: '종료',
  navTitle: '문제 네비게이션',
  statusCorrect: '정답',
  statusWrong: '오답',
  statusUnsolved: '미풀이',
  correct: '정답입니다!',
  wrong: '오답입니다!',
  answer: '정답',
  numberSuffix: '번',
  explanation: '해설',
  prev: '이전',
  next: '다음',
  check: '정답 확인',
  resultView: '결과 보기',
  backToSession: '회차 선택으로 돌아가기',
  lobbyTitle: '모의시험 준비',
  start: '시험 시작',
  score: '총 점수',
  pass: '합격입니다!',
  fail: '불합격입니다!',
  subject: '과목',
  qCount: '문제',
  avoidFail: '통과',
  failSubject: '과락',
  chooseOther: '다른 회차 선택',
};

const UPDATE_NOTICE_KEY = 'update_notice_2026_02_keyboard_nav';
const REPORT_TIP_NOTICE_KEY = 'report_tip_notice_2026_02_once';
const REPORT_REASONS = ['그림이 없음', '해설이 이상함', '해설이없음', '문제가 이상함', '문제가없음', '기타'];

export default function Quiz({ problems, session, answersMap, commentsMap, sessionId }) {
  const router = useRouter();
  const [allProblems] = useState(problems);
  const [quizProblems, setQuizProblems] = useState(problems);
  const [isStarted, setIsStarted] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [accumulatedAnswers, setAccumulatedAnswers] = useState({});
  const [checkedProblems, setCheckedProblems] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExplanationWhenCorrect, setShowExplanationWhenCorrect] = useState(true);
  const [showExplanationWhenIncorrect, setShowExplanationWhenIncorrect] = useState(true);
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);
  const [showReportTipNotice, setShowReportTipNotice] = useState(false);
  const [reportTipCountdown, setReportTipCountdown] = useState(5);
  const [reportReason, setReportReason] = useState('');
  const [reportEtcText, setReportEtcText] = useState('');

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(UPDATE_NOTICE_KEY);
      if (!seen) setShowUpdateNotice(true);
    } catch {
      setShowUpdateNotice(true);
    }
  }, []);

  useEffect(() => {
    if (!isStarted) return;
    try {
      const seen = window.localStorage.getItem(REPORT_TIP_NOTICE_KEY);
      if (!seen) setShowReportTipNotice(true);
    } catch {
      setShowReportTipNotice(true);
    }
  }, [isStarted]);

  useEffect(() => {
    if (!showReportTipNotice) return;
    setReportTipCountdown(5);

    const interval = window.setInterval(() => {
      setReportTipCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const timer = window.setTimeout(() => {
      setShowReportTipNotice(false);
      try {
        window.localStorage.setItem(REPORT_TIP_NOTICE_KEY, 'seen');
      } catch {}
    }, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [showReportTipNotice]);

  const handleStartQuiz = () => {
    setIsStarted(true);
    trackEvent('start_exam', { sessionId, path: `/test/${sessionId}` });
  };

  const handleSelectOption = (problemNumber, option) => {
    if (checkedProblems[problemNumber]) return;
    setAnswers((prev) => ({ ...prev, [problemNumber]: option }));
  };

  const handleSubmitQuiz = () => {
    const isRetryMode = quizProblems.length !== allProblems.length;
    const mergedAnswers = { ...accumulatedAnswers, ...answers };
    let totalCorrect = 0;
    let currentSetCorrect = 0;
    const currentSetTotal = quizProblems.length;
    const subjectCorrectCounts = { 1: 0, 2: 0, 3: 0 };
    const subjectTotalCounts = { 1: 0, 2: 0, 3: 0 };

    quizProblems.forEach((problem) => {
      const problemNum = parseInt(problem.problem_number, 10);
      if (problemNum >= 1 && problemNum <= 20) subjectTotalCounts[1]++;
      else if (problemNum >= 21 && problemNum <= 40) subjectTotalCounts[2]++;
      else if (problemNum >= 41 && problemNum <= 60) subjectTotalCounts[3]++;
    });

    allProblems.forEach((problem) => {
      const problemNum = parseInt(problem.problem_number, 10);
      const userAnswer = mergedAnswers[problem.problem_number];
      const correctAnswer = answersMap[problem.problem_number];

      if (userAnswer === correctAnswer) {
        totalCorrect++;
        if (problemNum >= 1 && problemNum <= 20) subjectCorrectCounts[1]++;
        else if (problemNum >= 21 && problemNum <= 40) subjectCorrectCounts[2]++;
        else if (problemNum >= 41 && problemNum <= 60) subjectCorrectCounts[3]++;
      }
    });

    quizProblems.forEach((problem) => {
      const userAnswer = mergedAnswers[problem.problem_number];
      const correctAnswer = answersMap[problem.problem_number];
      if (userAnswer === correctAnswer) currentSetCorrect++;
    });

    const subjectPassFail = {
      1: subjectCorrectCounts[1] >= 8,
      2: subjectCorrectCounts[2] >= 8,
      3: subjectCorrectCounts[3] >= 8,
    };
    const isOverallPass = totalCorrect >= 36 && subjectPassFail[1] && subjectPassFail[2] && subjectPassFail[3];

    setAccumulatedAnswers(mergedAnswers);
    trackEvent('finish_exam', {
      sessionId,
      path: `/test/${sessionId}`,
      payload: {
        totalCorrect,
        wrongCount: allProblems.length - totalCorrect,
        subjectCorrectCounts,
        isOverallPass,
        isRetryMode,
        currentSetCorrect,
        currentSetTotal,
        completionScope: quizProblems.length,
        completionTotal: allProblems.length,
      },
    });
    setQuizResults({
      totalCorrect,
      wrongCount: allProblems.length - totalCorrect,
      subjectCorrectCounts,
      subjectTotalCounts,
      subjectPassFail,
      isOverallPass,
      isRetryMode,
      currentSetCorrect,
      currentSetTotal,
    });
    setQuizCompleted(true);
  };

  const currentProblem = quizProblems[currentProblemIndex] ?? null;
  const currentProblemNumber = currentProblem?.problem_number;
  const isChecked = currentProblemNumber ? checkedProblems[currentProblemNumber] : false;
  const selectedAnswer = currentProblemNumber ? answers[currentProblemNumber] : null;
  const correctAnswer = currentProblemNumber && answersMap ? answersMap[currentProblemNumber] : null;
  const isCorrect = selectedAnswer === correctAnswer;
  const correctAnswerIndex = currentProblem ? currentProblem.options.indexOf(correctAnswer) : -1;
  const showResult = isChecked;
  const shouldShowExplanation = showResult && ((isCorrect && showExplanationWhenCorrect) || (!isCorrect && showExplanationWhenIncorrect));
  const explanationText =
    currentProblemNumber && commentsMap ? commentsMap[currentProblemNumber] : '';

  const formatExplanation = (text) => {
    if (!text) return '';

    return text
      .replace(/\r\n?/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\u00A0/g, ' ')
      // 헤더/구분선 앞뒤 정리
      .replace(/\s*(={3,})\s*/g, '\n\n')
      // 숫자 목록(1) / 1. / 1) 형태 줄바꿈
      .replace(/\s+(\d+[\)\.]\s)/g, '\n')
      // 불릿(-, *, •) 줄바꿈
      .replace(/\s+([\-\*•]\s+)/g, '\n')
      // 문장 단위 줄바꿈(. ! ? 뒤 공백 기준)
      .replace(/([.!?])\s+(?=[^\d])/g, '$1\n')
      // 콜론 라벨은 줄 유지
      .replace(/\s*:\s*/g, ': ')
      // 과도한 공백/빈줄 정리
      .replace(/[\t ]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  useEffect(() => {
    if (!isStarted || quizCompleted) return;

    const onKeyDown = (e) => {
      const target = e.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      const isEditable = tag === 'input' || tag === 'textarea' || (target && target.isContentEditable);
      if (isEditable) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        if (!currentProblem || isChecked) return;
        const idx = Number(e.key) - 1;
        const option = currentProblem.options[idx];
        if (!option) return;
        e.preventDefault();
        handleSelectOption(currentProblem.problem_number, option);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isChecked) {
          if (selectedAnswer) handleNextClick();
          return;
        }

        if (currentProblemIndex === quizProblems.length - 1) {
          handleSubmitQuiz();
        } else {
          handleNextClick();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isStarted,
    quizCompleted,
    isChecked,
    selectedAnswer,
    currentProblem,
    currentProblemIndex,
    quizProblems.length,
  ]);

  const handleNextClick = () => {
    if (!currentProblem) return;
    if (!isChecked) {
      if (!selectedAnswer) {
        alert(T.needSelect);
        return;
      }
      setCheckedProblems((prev) => ({ ...prev, [currentProblemNumber]: true }));
      return;
    }
    if (currentProblemIndex < quizProblems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
    }
  };

  const handleReportProblem = async () => {
    if (!currentProblem || !reportReason) return;
    if (reportReason === '기타' && !reportEtcText.trim()) {
      alert('기타 사유를 입력해주세요.');
      return;
    }
    const finalReason = reportReason === '기타' ? `기타: ${reportEtcText.trim()}` : reportReason;
    await trackEvent('report_problem', {
      sessionId,
      path: `/test/${sessionId}`,
      payload: {
        problemNumber: currentProblem.problem_number,
        reason: finalReason,
        questionText: String(currentProblem.question_text || '').slice(0, 150),
      },
    });
    alert('신고가 접수되었습니다.');
    setReportReason('');
    setReportEtcText('');
  };

  useEffect(() => {
    setReportReason('');
    setReportEtcText('');
  }, [currentProblemNumber]);

  const goToPreviousProblem = () => {
    if (currentProblemIndex > 0) setCurrentProblemIndex(currentProblemIndex - 1);
  };

  const goToProblem = (index) => {
    if (index >= 0 && index < quizProblems.length) setCurrentProblemIndex(index);
  };

  const handleRetryWrongProblems = () => {
    const mergedAnswers = { ...accumulatedAnswers, ...answers };
    const wrongProblems = allProblems.filter((p) => mergedAnswers[p.problem_number] !== answersMap[p.problem_number]);
    if (wrongProblems.length === 0) return;

    setAccumulatedAnswers(mergedAnswers);
    setQuizProblems(wrongProblems);
    setAnswers({});
    setCheckedProblems({});
    setCurrentProblemIndex(0);
    setQuizCompleted(false);
    setQuizResults(null);
  };

  const handleEndQuiz = () => {
    const shouldEnd = window.confirm('\uC885\uB8CC\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?');
    if (!shouldEnd) return;

    const mergedAnswers = { ...accumulatedAnswers, ...answers };
    let totalCorrect = 0;
    allProblems.forEach((problem) => {
      const userAnswer = mergedAnswers[problem.problem_number];
      const correctAnswer = answersMap[problem.problem_number];
      if (userAnswer === correctAnswer) totalCorrect++;
    });

    const solvedCount = allProblems.filter((problem) => mergedAnswers[problem.problem_number] !== undefined).length;
    const totalCount = allProblems.length;
    alert(
      `\uD604\uC7AC \uC810\uC218: ${totalCorrect} / ${totalCount}\n` +
      `\uD480\uC774 \uC644\uB8CC: ${solvedCount} / ${totalCount}`
    );
    router.push('/test');
  };

  const getProblemStatus = (problem) => {
    const num = problem.problem_number;
    if (!checkedProblems[num]) return '?';
    return answers[num] === answersMap[num] ? 'O' : 'X';
  };

  if (!currentProblem) {
    return <div>{T.loadFail}</div>;
  }

  const getStatusClass = (status) => {
    if (status === 'O') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'X') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (!isStarted) {
    return (
      <>
        <TestLobby session={session} onStart={handleStartQuiz} problemCount={quizProblems.length} />
        <UpdateNoticeModal
          isOpen={showUpdateNotice}
          onClose={() => {
            setShowUpdateNotice(false);
            try {
              window.localStorage.setItem(UPDATE_NOTICE_KEY, 'seen');
            } catch {}
          }}
        />
      </>
    );
  }

  if (quizCompleted) {
    return <QuizResults session={session} results={quizResults} onRetryWrong={handleRetryWrongProblems} />;
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md p-4 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-indigo-900 hidden md:block">{session.title}</h1>
          <h1 className="text-xl font-bold text-indigo-900 md:hidden">{session.title.split(' ')[0]}...</h1>
        </div>
        <div className="text-lg font-semibold text-gray-900">
          {T.problem} {currentProblemIndex + 1} / {quizProblems.length}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-20">
                <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">{T.settings}</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showExplanationWhenCorrect}
                      onChange={(e) => setShowExplanationWhenCorrect(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{T.showCorrect}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showExplanationWhenIncorrect}
                      onChange={(e) => setShowExplanationWhenIncorrect(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{T.showWrong}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleEndQuiz}
            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm md:text-base"
          >
            {T.end}
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 md:gap-6">
          <aside className="bg-white rounded-xl shadow-lg p-4 h-fit lg:sticky lg:top-24">
            <h3 className="text-sm font-bold text-gray-700 mb-3">{T.navTitle}</h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2">
              {quizProblems.map((problem, index) => {
                const status = getProblemStatus(problem);
                const isCurrent = index === currentProblemIndex;
                return (
                  <button
                    key={problem.problem_number}
                    onClick={() => goToProblem(index)}
                    className={`h-10 rounded-md border text-xs font-semibold transition ${getStatusClass(status)} ${isCurrent ? 'ring-2 ring-indigo-500' : ''}`}
                    title={`${T.problem} ${problem.problem_number} (${status})`}
                  >
                    {problem.problem_number} {status}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <p><span className="font-bold text-green-700">O</span> {T.statusCorrect}</p>
              <p><span className="font-bold text-red-700">X</span> {T.statusWrong}</p>
              <p><span className="font-bold text-gray-700">?</span> {T.statusUnsolved}</p>
            </div>
          </aside>

          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <p className="text-sm font-semibold text-indigo-600 mb-2">{currentProblem.sectionTitle}</p>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 leading-relaxed">
              {currentProblem.problem_number}. {currentProblem.question_text}
            </h2>

            <div className="space-y-4">
              {currentProblem.options.map((option, index) => {
                let buttonClass = 'bg-white hover:bg-indigo-50 border-indigo-200 text-gray-800';
                if (selectedAnswer === option) {
                  buttonClass = 'bg-indigo-100 text-indigo-700 border-indigo-500 ring-2 ring-indigo-500 font-bold';
                  if (showResult) {
                    buttonClass = isCorrect
                      ? 'bg-green-100 text-green-800 border-green-500 ring-2 ring-green-500'
                      : 'bg-red-100 text-red-800 border-red-500 ring-2 ring-red-500';
                  }
                }
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(currentProblem.problem_number, option)}
                    disabled={isChecked}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${buttonClass} ${isChecked ? 'cursor-not-allowed opacity-90' : ''}`}
                  >
                    {index + 1}. {option}
                  </button>
                );
              })}
            </div>

            {shouldShowExplanation && (
              <div className={`mt-6 p-6 rounded-lg animate-in fade-in border ${isCorrect ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`text-lg font-bold mb-1 ${isCorrect ? 'text-blue-800' : 'text-red-800'}`}>
                  {isCorrect ? T.correct : T.wrong}
                </h3>
                <p className="text-lg font-semibold text-indigo-900 mb-3">
                  {T.answer}: {correctAnswerIndex + 1}{T.numberSuffix}
                </p>
                {explanationText && (
                  <p className={`text-gray-700 whitespace-pre-wrap border-t pt-3 leading-relaxed ${isCorrect ? 'border-blue-100' : 'border-red-100'}`}>
                    <span className="font-semibold">{T.explanation}:</span>{'\n'}
                    {formatExplanation(explanationText)}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={isChecked ? (currentProblemIndex === quizProblems.length - 1 ? handleSubmitQuiz : handleNextClick) : handleNextClick}
                disabled={!isChecked && !selectedAnswer}
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed inline-flex items-center"
              >
                {isChecked ? (currentProblemIndex === quizProblems.length - 1 ? T.resultView : T.next) : T.check}
                {isChecked && currentProblemIndex !== quizProblems.length - 1 && <ChevronRight className="ml-2 w-5 h-5" />}
              </button>
            </div>

            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">문제 신고하기</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                >
                  <option value="" style={{ color: '#6b7280', backgroundColor: '#ffffff' }}>
                    선택해주세요
                  </option>
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason} style={{ color: '#111827', backgroundColor: '#ffffff' }}>
                      {reason}
                    </option>
                  ))}
                </select>
                {reportReason === '기타' && (
                  <input
                    type="text"
                    value={reportEtcText}
                    onChange={(e) => setReportEtcText(e.target.value)}
                    placeholder="신고 사유를 입력해주세요"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
                <button
                  onClick={handleReportProblem}
                  disabled={!reportReason || (reportReason === '기타' && !reportEtcText.trim())}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed"
                >
                  신고하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-t-md p-4 flex justify-between items-center">
        <button
          onClick={goToPreviousProblem}
          disabled={currentProblemIndex === 0}
          className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center"
        >
          <ChevronLeft className="mr-2 w-5 h-5" />
          {T.prev}
        </button>
        <div />
      </footer>

      {showReportTipNotice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
          <div className="mt-4 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-amber-200 p-4 text-center animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-base md:text-lg font-bold text-gray-800 leading-relaxed">
              문제에 버그가 있다면 화면 하단의
              <br />
              신고하기로 제보해주세요.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-700">
              {reportTipCountdown <= 3
                ? `${reportTipCountdown}초 후 닫힙니다.`
                : '잠시 후 자동으로 닫힙니다.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateNoticeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 md:p-7">
        <h2 className="text-xl md:text-2xl font-extrabold text-sky-900 mb-4">업데이트 안내</h2>
        <div className="space-y-2 text-sm md:text-base text-gray-700">
          <p>사용자 편의성 개선 사항이 적용되었습니다.</p>
          <p>문제 네비게이션(1~60)에서 O / X / ? 상태를 바로 확인할 수 있습니다.</p>
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

function TestLobby({ session, onStart, problemCount }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl text-center">
        <Link href="/test" className="inline-flex items-center text-gray-600 hover:text-indigo-700 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          {T.backToSession}
        </Link>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200/50">
          <p className="text-indigo-600 font-semibold">{T.lobbyTitle}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 mb-4">{session.title}</h1>
          <p className="text-gray-700 mb-8">총 {problemCount}문항 / 90분(3과목)</p>
          <button
            onClick={onStart}
            className="w-full max-w-xs mx-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 inline-flex items-center justify-center"
          >
            <PlayCircle className="w-6 h-6 mr-3" />
            {T.start}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizResults({ session, results, onRetryWrong }) {
  const {
    totalCorrect,
    wrongCount,
    subjectCorrectCounts,
    subjectTotalCounts,
    subjectPassFail,
    isOverallPass,
    isRetryMode,
    currentSetCorrect,
    currentSetTotal,
  } = results;
  const [showFailModal, setShowFailModal] = useState(!isRetryMode && !isOverallPass);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl text-center">
        <Link href="/test" className="inline-flex items-center text-gray-600 hover:text-indigo-700 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          {T.backToSession}
        </Link>
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200/50">
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 mb-2">{session.title}</h1>
          {isRetryMode && (
            <p className="text-base md:text-lg font-semibold text-indigo-700 mb-2">오답 재풀이 결과</p>
          )}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {T.score}: {totalCorrect} / 60
            </h2>
            <p className={`text-3xl font-extrabold ${isOverallPass ? 'text-green-600' : 'text-red-600'}`}>
              {isOverallPass ? T.pass : T.fail}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-lg">
            {[1, 2, 3].map((subjectNum) => (
              <div
                key={subjectNum}
                className={`p-4 rounded-lg border-2 ${subjectPassFail[subjectNum] ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}
              >
                <p className="font-semibold text-gray-700">{T.subject} {subjectNum}</p>
                <p className="text-xl font-bold text-gray-900">
                  {subjectCorrectCounts[subjectNum]} / {subjectTotalCounts?.[subjectNum] ?? 20} {T.qCount}
                </p>
                <p className={`font-semibold ${subjectPassFail[subjectNum] ? 'text-green-600' : 'text-red-600'}`}>
                  {subjectPassFail[subjectNum] ? T.avoidFail : T.failSubject}
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
          <Link
            href="/test"
            className="w-full max-w-xs mx-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 inline-flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 mr-3" />
            {T.chooseOther}
          </Link>
        </div>
      </div>
      {!isRetryMode && !isOverallPass && showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200 p-6 text-center">
            <p className="text-lg font-bold text-gray-800 mb-5">이터널 리턴.. 조금만 할까?</p>
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
