import Link from 'next/link';
import { FileText, LayoutGrid, CheckCircle, BrainCircuit, ArrowRight, Star } from 'lucide-react';

const features = [
  {
    icon: <FileText className="w-8 h-8 text-sky-500" />,
    title: '실전 시험과 유사한 환경',
    description: '실제 CBT 시험과 동일한 구성의 3과목, 총 60문항을 연습할 수 있습니다.',
  },
  {
    icon: <CheckCircle className="w-8 h-8 text-sky-500" />,
    title: '자동 채점 및 합격 판정',
    description: '과락 기준과 총점을 기준으로 자동 채점하여 결과를 바로 확인할 수 있습니다.',
  },
  {
    icon: <LayoutGrid className="w-8 h-8 text-sky-500" />,
    title: '상세한 해설 제공',
    description: '틀린 문제의 핵심 포인트를 중심으로 이해하기 쉽게 해설을 제공합니다.',
  },
  {
    icon: <BrainCircuit className="w-8 h-8 text-sky-500" />,
    title: 'AI 기반 맞춤 학습(예정)',
    description: '오답 패턴을 분석해 개인 취약 영역 중심의 문제 추천 기능을 준비 중입니다.',
  },
];

const testimonials = [
  {
    name: '박OO',
    date: '2024년 1월 15일',
    text: '실전처럼 연습할 수 있어 시간 관리에 큰 도움이 됐습니다.',
    rating: 5,
  },
  {
    name: '김OO',
    date: '2024년 1월 12일',
    text: '틀린 문제 해설이 깔끔해서 복습 효율이 정말 좋았습니다.',
    rating: 5,
  },
  {
    name: '반OO',
    date: '2023년 12월 28일',
    text: '모바일에서도 잘 동작해서 출퇴근 시간에 꾸준히 공부할 수 있었어요.',
    rating: 5,
  },
  {
    name: '이OO',
    date: '2023년 12월 20일',
    text: 'UI가 단순해서 문제 풀이에만 집중하기 좋았습니다.',
    rating: 4,
  },
  {
    name: '최OO',
    date: '2023년 11월 30일',
    text: '반복 학습하기에 좋아서 실전 감각 올리기에 좋습니다.',
    rating: 5,
  },
];

const StarRating = ({ rating }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
      />
    ))}
  </div>
);

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-white">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-sky-900 tracking-tight">
            정보처리산업기사 CBT 모의시험
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-600">
            실제 시험과 유사한 환경에서 기출 문제를 풀고 합격을 준비하세요.
          </p>
          <Link
            href="/test"
            className="mt-8 px-8 py-4 bg-sky-600 text-white font-bold text-lg rounded-full hover:bg-sky-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300 inline-flex items-center"
          >
            모의시험 시작하기 <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200/50"
            >
              <div className="flex items-center justify-center w-16 h-16 bg-sky-100 rounded-full mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-sky-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-sky-900 mb-12">
            수험생 후기
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/50 flex flex-col"
              >
                <div className="mb-4">
                  <StarRating rating={testimonial.rating} />
                </div>
                <p className="text-gray-700 flex-grow">&quot;{testimonial.text}&quot;</p>
                <div className="mt-4 text-right">
                  <p className="font-semibold text-sky-800">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-gray-500">
        <p>&copy; {new Date().getFullYear()} CBT Practice System. All rights reserved.</p>
      </footer>
    </div>
  );
}
