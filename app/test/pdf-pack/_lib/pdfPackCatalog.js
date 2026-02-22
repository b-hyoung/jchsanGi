export const PDF_PACKS = {
  'industrial-2025-1': {
    slug: 'industrial-2025-1',
    title: '2025년 1회 정보처리산업기사 필기 (PDF 추출본)',
    shortTitle: '2025년 1회 산업기사 필기',
    description: 'PDF 원본에서 문제/보기/정답을 추출한 검수용 세트입니다.',
    kindLabel: '기출문제 PDF 추출본',
  },
  'industrial-2025-2': {
    slug: 'industrial-2025-2',
    title: '2025년 2회 정보처리산업기사 필기 (PDF 추출본)',
    shortTitle: '2025년 2회 산업기사 필기',
    description: 'PDF 원본에서 문제/보기/정답을 추출한 검수용 세트입니다.',
    kindLabel: '기출문제 PDF 추출본',
  },
  'industrial-2025-3': {
    slug: 'industrial-2025-3',
    title: '2025년 3회 정보처리산업기사 필기 (PDF 추출본)',
    shortTitle: '2025년 3회 산업기사 필기',
    description: 'PDF 원본에서 문제/보기/정답을 추출한 검수용 세트입니다.',
    kindLabel: '기출문제 PDF 추출본',
  },
};

export function getPdfPackConfig(slug) {
  return PDF_PACKS[String(slug)] || null;
}

export function listPdfPackConfigs() {
  return Object.values(PDF_PACKS);
}

