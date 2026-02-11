import { FileText, LayoutGrid, CheckCircle, BrainCircuit, ArrowRight, Star } from 'lucide-react';

const features = [
  {
    icon: <FileText className="w-8 h-8 text-sky-500" />,
    title: '실제 시험과 유사한 환경',
    description: '실제 CBT 시험과 동일한 구성의 3과목, 총 60문항을 풀어볼 수 있습니다.',
  },
  {
    icon: <CheckCircle className="w-8 h-8 text-sky-500" />,
    title: '자동 채점 및 합격 판정',
    description: '과락 및 합격 여부를 포함한 전체 점수를 자동으로 채점하여 결과를 보여줍니다.',
  },
  {
    icon: <LayoutGrid className="w-8 h-8 text-sky-500" />,
    title: '상세한 해설 제공',
    description: '틀린 문제에 대한 명확한 해설을 통해 개념을 다시 한번 복습할 수 있습니다.',
  },
  {
    icon: <BrainCircuit className="w-8 h-8 text-sky-500" />,
    title: 'AI 기반 개인화 (예정)',
    description: 'AI가 틀린 문제를 분석하여, 개인의 취약점에 맞춘 새로운 문제를 생성해 제공합니다.',
  },
];

const testimonials = [
  {
    name: '박x석',
    date: '2024년 1월 15일',
    text: '실제 시험보는 것 같아서 시간 관리 연습에 큰 도움이 되었습니다. 덕분에 긴장하지 않고 시험을 잘 마쳤습니다.',
    rating: 5,
  },
  {
    name: '김x혁',
    date: '2024년 1월 12일',
    text: '틀린 문제 해설이 정말 유용했어요. 어떤 부분이 부족한지 명확히 알 수 있었고, 개념을 다시 잡는 데 최고였습니다.',
    rating: 5,
  },
  {
    name: '박x민',
    date: '2023년 12월 28일',
    text: '반복해서 풀어볼 수 있다는 점이 가장 좋았어요. 여러 번 풀다 보니 자연스럽게 문제 유형이 익혀졌습니다.',
    rating: 5,
  },
  {
    name: '김x경',
    date: '2023년 12월 20일',
    text: 'UI가 깔끔하고 사용하기 편해서 공부에 집중하기 좋았습니다. 다른 자격증 시험도 이런 시스템이 있으면 좋겠네요.',
    rating: 4,
  },
  {
    name: '이x수',
    date: '2023년 11월 30일',
    text: '모바일에서도 불편함 없이 이용할 수 있어서 출퇴근길에 틈틈이 공부할 수 있었어요. 합격에 큰 보탬이 됐습니다!',
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
    <div className="min-h-screen w-full">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-sky-900 tracking-tight">
            정보처리산업기사 CBT 모의시험
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-600">
            실제 시험과 가장 유사한 환경에서 기출문제를 풀고 합격을 준비하세요.
          </p>
          <button className="mt-8 px-8 py-4 bg-sky-600 text-white font-bold text-lg rounded-full hover:bg-sky-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300 inline-flex items-center">
            모의시험 시작하기 <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200/50">
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
            합격자들이 증명하는 최고의 학습 경험
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-200/50 flex flex-col">
                <div className="mb-4">
                  <StarRating rating={testimonial.rating} />
                </div>
                <p className="text-gray-700 flex-grow">"{testimonial.text}"</p>
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
