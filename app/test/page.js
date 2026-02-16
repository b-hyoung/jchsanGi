import Link from 'next/link';
import { Book, ChevronRight } from 'lucide-react';

const testSessions = [
  { id: 1, title: '정보처리산업기사 2024년 1회', description: '새롭게 추가된 2024년 1회 기출문제입니다.' },
  { id: 4, title: '정보처리산업기사 2024년 2회', description: '새롭게 추가된 2024년 2회 기출문제입니다.' },
];

export default function TestSelectionPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-sky-900 tracking-tight">
              모의시험 회차 선택
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              원하는 회차를 선택하여 실전처럼 연습을 시작하세요.
            </p>
          </div>

          <div className="space-y-6">
            {testSessions.map((session) => (
              <Link
                key={session.id}
                href={`/test/${session.id}`}
                className="block p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 hover:border-sky-300 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-sky-100 rounded-xl mr-6">
                      <Book className="w-6 h-6 text-sky-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-sky-900">{session.title}</h2>
                      <p className="text-gray-600 mt-1">{session.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-8 h-8 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
