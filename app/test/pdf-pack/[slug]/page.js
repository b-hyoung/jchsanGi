import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText } from 'lucide-react';
import { getPdfPackConfig } from '../_lib/pdfPackCatalog';
import { loadPdfPackFiles } from '../_lib/loadPdfPackQuiz';

export const dynamic = 'force-dynamic';

export default async function PdfPackDetailPage({ params }) {
  const { slug } = await params;
  const cfg = getPdfPackConfig(slug);
  if (!cfg) notFound();

  let meta;
  try {
    ({ meta } = await loadPdfPackFiles(slug));
  } catch (error) {
    console.error(`Failed to load pdf pack meta (${slug}):`, error);
    notFound();
  }

  const totalProblems = Number(meta?.totalProblems || 0);
  const answerCount = Number(meta?.answerCount || 0);
  const explanationStatus = String(meta?.explanationExtraction?.status || 'unknown');
  const expertMarkerCount = Number(meta?.explanationExtraction?.expertMarkerCount || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-sky-100 text-gray-800">
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Link href="/test" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900">
            ← 모의시험 회차 선택으로 돌아가기
          </Link>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                <FileText className="h-6 w-6 text-sky-700" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold text-sky-950">{cfg.shortTitle}</h1>
                <p className="mt-1 text-sm text-gray-600">{cfg.description}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-gray-500">PDF 파일명</p>
                <p className="mt-1 text-sm font-semibold text-gray-800 break-all">{meta?.pdfFileName || '-'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-gray-500">문항 수</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{totalProblems}문항</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-gray-500">정답 추출</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{answerCount}/{totalProblems}개</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-gray-500">해설 추출 상태</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {explanationStatus === 'placeholder' ? '임시 해설(경계 손실)' : explanationStatus}
                </p>
                {expertMarkerCount > 0 && (
                  <p className="mt-1 text-xs text-gray-500">전문가의 조언 마커 감지: {expertMarkerCount}개</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              그림/표/수식 요소는 추후 수동 보강 예정입니다. 현재는 문제/보기/정답/해설(임시 포함) 검수에 집중할 수 있도록 구성했습니다.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/test/pdf-pack/${slug}/quiz`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white hover:bg-sky-700"
              >
                문제 풀어보기
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/test"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                다른 세트 보기
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

