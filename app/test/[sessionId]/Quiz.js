'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';

// Main Quiz Component
export default function Quiz({ problems, session }) {
  const [isStarted, setIsStarted] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  if (!problems || problems.length === 0) {
    return <div>문제를 불러오는 데 실패했습니다.</div>;
  }

  const handleStartQuiz = () => {
    setIsStarted(true);
  };

  const handleSelectOption = (problemNumber, option) => {
    setAnswers({
      ...answers,
      [problemNumber]: option,
    });
  };

  const goToNextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1);
    }
  };

  const goToPreviousProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1);
    }
  };

  if (!isStarted) {
    return <TestLobby session={session} onStart={handleStartQuiz} problemCount={problems.length} />;
  }

  const currentProblem = problems[currentProblemIndex];
  const selectedAnswer = answers[currentProblem.problem_number];

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-900">{session.title}</h1>
        <div className="text-lg font-semibold text-gray-900">
          문제 {currentProblemIndex + 1} / {problems.length}
        </div>
        <button className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">
          시험 종료
        </button>
      </header>

      <main className="flex-grow container mx-auto p-8">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <p className="text-sm font-semibold text-indigo-600 mb-2">{currentProblem.sectionTitle}</p>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            {currentProblem.problem_number}. {currentProblem.question_text}
          </h2>
          <div className="space-y-4">
            {currentProblem.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelectOption(currentProblem.problem_number, option)}
                className={`w-full text-left text-gray-500 p-4 rounded-lg border-2 transition-all
                  ${selectedAnswer === option
                    ? 'bg-indigo-100 text-skyblue border-indigo-500 ring-2 ring-indigo-500'
                    : 'bg-white hover:bg-indigo-50 border-indigo-200'
                  }`}
              >
                {index + 1}. {option}
              </button>
            ))}
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
          이전
        </button>
        <button
          onClick={goToNextProblem}
          disabled={currentProblemIndex === problems.length - 1}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed inline-flex items-center"
        >
          다음
          <ChevronRight className="ml-2 w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}


// Lobby Component (before quiz starts)
function TestLobby({ session, onStart, problemCount }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl text-center">
        <Link href="/test" className="inline-flex items-center text-gray-600 hover:text-indigo-700 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          회차 선택으로 돌아가기
        </Link>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200/50">
          <p className="text-indigo-600 font-semibold">모의시험 준비</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 mb-4">
            {session.title}
          </h1>
          <p className="text-gray-700 mb-8">
            총 {problemCount}문항 / 90분 (3과목)
          </p>
          <button
            onClick={onStart}
            className="w-full max-w-xs mx-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 inline-flex items-center justify-center"
          >
            <PlayCircle className="w-6 h-6 mr-3" />
            시험 시작
          </button>
        </div>
      </div>
    </div>
  );
}
