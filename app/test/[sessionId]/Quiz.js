'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlayCircle, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

// Main Quiz Component
export default function Quiz({ problems, session, answersMap, commentsMap }) {
  const [isStarted, setIsStarted] = useState(false);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [checkedProblems, setCheckedProblems] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false); // New state to track quiz completion
  const [quizResults, setQuizResults] = useState(null);     // New state to store quiz results
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExplanationWhenCorrect, setShowExplanationWhenCorrect] = useState(true);
  const [showExplanationWhenIncorrect, setShowExplanationWhenIncorrect] = useState(true);

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

  const handleSubmitQuiz = () => {
    let totalCorrect = 0;
    const subjectCorrectCounts = { 1: 0, 2: 0, 3: 0 }; // Subjects: 1-20, 21-40, 41-60

    problems.forEach(problem => {
      const problemNum = parseInt(problem.problem_number, 10);
      const userAnswer = answers[problem.problem_number];
      const correctAnswer = answersMap[problem.problem_number];

      if (userAnswer === correctAnswer) {
        totalCorrect++;
        if (problemNum >= 1 && problemNum <= 20) {
          subjectCorrectCounts[1]++;
        } else if (problemNum >= 21 && problemNum <= 40) {
          subjectCorrectCounts[2]++;
        } else if (problemNum >= 41 && problemNum <= 60) {
          subjectCorrectCounts[3]++;
        }
      }
    });

    const subjectPassFail = {
      1: subjectCorrectCounts[1] >= 13, // 20 questions, need >= 13 correct (max 7 wrong)
      2: subjectCorrectCounts[2] >= 13,
      3: subjectCorrectCounts[3] >= 13,
    };

    const isOverallPass = totalCorrect >= 36 && subjectPassFail[1] && subjectPassFail[2] && subjectPassFail[3];

    setQuizResults({
      totalCorrect,
      subjectCorrectCounts,
      subjectPassFail,
      isOverallPass,
    });
    setQuizCompleted(true);
  };

  const currentProblem = problems[currentProblemIndex];
  const isChecked = checkedProblems[currentProblem.problem_number];

  const handleNextClick = () => {
    const selectedAnswer = answers[currentProblem.problem_number];
    
    // If not checked yet, perform check
    if (!isChecked) {
      if (!selectedAnswer) {
        alert("답을 선택해주세요.");
        return;
      }
      setCheckedProblems(prev => ({
        ...prev,
        [currentProblem.problem_number]: true
      }));
    } else {
      // If already checked, move to next problem
      if (currentProblemIndex < problems.length - 1) {
        setCurrentProblemIndex(currentProblemIndex + 1);
      }
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

  if (quizCompleted) {
    return <QuizResults session={session} results={quizResults} />;
  }

  const selectedAnswer = answers[currentProblem.problem_number];
  const correctAnswer = answersMap ? answersMap[currentProblem.problem_number] : null;
  const isCorrect = selectedAnswer === correctAnswer;
  
  // Find the index of the correct answer to display it (1-based)
  const correctAnswerIndex = currentProblem.options.indexOf(correctAnswer);
  
  // Show results logic
  const showResult = isChecked;
  const shouldShowExplanation = showResult && (
    (isCorrect && showExplanationWhenCorrect) || 
    (!isCorrect && showExplanationWhenIncorrect)
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md p-4 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-indigo-900 hidden md:block">{session.title}</h1>
          <h1 className="text-xl font-bold text-indigo-900 md:hidden">{session.title.split(' ')[0]}...</h1>
        </div>

        <div className="text-lg font-semibold text-gray-900">
          문제 {currentProblemIndex + 1} / {problems.length}
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
                <h3 className="font-bold text-gray-900 mb-3 pb-2 border-b">해설 설정</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showExplanationWhenCorrect}
                      onChange={(e) => setShowExplanationWhenCorrect(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">정답을 맞췄을 때 해설 보기</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showExplanationWhenIncorrect}
                      onChange={(e) => setShowExplanationWhenIncorrect(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">오답일 때 해설 보기</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm md:text-base">
            종료
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
          <p className="text-sm font-semibold text-indigo-600 mb-2">{currentProblem.sectionTitle}</p>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 leading-relaxed">
            {currentProblem.problem_number}. {currentProblem.question_text}
          </h2>
          <div className="space-y-4">
            {currentProblem.options.map((option, index) => {
              let buttonClass = "bg-white hover:bg-indigo-50 border-indigo-200 text-gray-800";
              
              if (selectedAnswer === option) {
                // Base style for selected
                buttonClass = "bg-indigo-100 text-indigo-700 border-indigo-500 ring-2 ring-indigo-500 font-bold";
                
                // If checked, override with result colors
                if (showResult) {
                  if (isCorrect) {
                    buttonClass = "bg-green-100 text-green-800 border-green-500 ring-2 ring-green-500";
                  } else {
                    buttonClass = "bg-red-100 text-red-800 border-red-500 ring-2 ring-red-500";
                  }
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelectOption(currentProblem.problem_number, option)}
                  disabled={isChecked} // Disable changing answer after checking
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${buttonClass} ${isChecked ? 'cursor-default' : ''}`}
                >
                  {index + 1}. {option}
                </button>
              );
            })}
          </div>

          {shouldShowExplanation && (
            <div className={`mt-6 p-6 rounded-lg animate-in fade-in slide-in-from-top-2 border ${
              isCorrect ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`text-lg font-bold mb-1 ${isCorrect ? 'text-blue-800' : 'text-red-800'}`}>
                {isCorrect ? '정답입니다!' : '오답입니다!'}
              </h3>
              <p className="text-lg font-semibold text-indigo-900 mb-3">
                정답: {correctAnswerIndex + 1}번
              </p>
              {commentsMap && commentsMap[currentProblem.problem_number] && (
                <p className={`text-gray-700 whitespace-pre-line border-t pt-3 ${
                  isCorrect ? 'border-blue-100' : 'border-red-100'
                }`}>
                  <span className="font-semibold">해설:</span> {commentsMap[currentProblem.problem_number]}
                </p>
              )}
            </div>
          )}
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
          onClick={currentProblemIndex === problems.length - 1 && isChecked ? handleSubmitQuiz : handleNextClick}
          disabled={!isChecked && currentProblemIndex === problems.length - 1 && !answers[currentProblem.problem_number]} 
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed inline-flex items-center"
        >
          {isChecked ? (currentProblemIndex === problems.length - 1 ? '결과 보기' : '다음') : '정답 확인'}
          {isChecked && currentProblemIndex !== problems.length - 1 && <ChevronRight className="ml-2 w-5 h-5" />}
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


// QuizResults Component
function QuizResults({ session, results }) {
  const { totalCorrect, subjectCorrectCounts, subjectPassFail, isOverallPass } = results;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-indigo-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl text-center">
        <Link href="/test" className="inline-flex items-center text-gray-600 hover:text-indigo-700 mb-8 group">
          <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
          회차 선택으로 돌아가기
        </Link>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200/50">
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 mb-4">
            {session.title} 결과
          </h1>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">총 점수: {totalCorrect} / 60</h2>
            <p className={`text-3xl font-extrabold ${isOverallPass ? 'text-green-600' : 'text-red-600'}`}>
              {isOverallPass ? '합격입니다!' : '불합격입니다!'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-lg">
            {[1, 2, 3].map(subjectNum => (
              <div key={subjectNum} className={`p-4 rounded-lg border-2 ${
                subjectPassFail[subjectNum] ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
              }`}>
                <p className="font-semibold text-gray-700">과목 {subjectNum}</p>
                <p className="text-xl font-bold text-gray-900">
                  {subjectCorrectCounts[subjectNum]} / 20 문제
                </p>
                <p className={`font-semibold ${subjectPassFail[subjectNum] ? 'text-green-600' : 'text-red-600'}`}>
                  {subjectPassFail[subjectNum] ? '과락 면함' : '과락'}
                </p>
              </div>
            ))}
          </div>

          <Link
            href="/test"
            className="w-full max-w-xs mx-auto px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 inline-flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 mr-3" />
            다른 회차 선택
          </Link>
        </div>
      </div>
    </div>
  );
}