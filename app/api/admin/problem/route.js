import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SESSION_PATHS = {
  '1': ['problem2024', 'first'],
  '2': ['problem2024', 'second'],
  '3': ['problem2024', 'third'],
  '4': ['problem2024', 'second'],
  '5': ['problem2024', 'third'],
  '6': ['problem2023', 'first'],
  '7': ['problem2023', 'second'],
  '8': ['problem2023', 'third'],
  '9': ['problem2022', 'first'],
  '10': ['problem2022', 'second'],
  '11': ['problem2022', 'third'],
  '12': ['problemNow_60', 'first'],
  '100': ['problem100', 'first'],
};

async function loadSessionData(sessionId) {
  const rel = SESSION_PATHS[sessionId];
  if (!rel) return null;

  const basePath = path.join(process.cwd(), ...rel);
  const problemStr = await fs
    .readFile(path.join(basePath, 'problem1.json'), 'utf8')
    .catch(async (error) => {
      if (error?.code === 'ENOENT') {
        return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
      }
      throw error;
    });
  const [answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const problems = problemData.flatMap((section) =>
    (section.problems || []).map((p) => ({ ...p, sectionTitle: section.title }))
  );

  const answersMap = answerData.reduce((acc, section) => {
    (section.answers || []).forEach((a) => {
      acc[a.problem_number] = a.correct_answer_text;
    });
    return acc;
  }, {});

  const commentsMap = commentData.reduce((acc, section) => {
    (section.comments || []).forEach((c) => {
      acc[c.problem_number] = c.comment ?? c.comment_text ?? '';
    });
    return acc;
  }, {});

  return { problems, answersMap, commentsMap };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = String(searchParams.get('sessionId') || '').trim();
    const problemNumber = Number(searchParams.get('problemNumber'));

    if (!sessionId || Number.isNaN(problemNumber)) {
      return NextResponse.json({ message: 'sessionId and problemNumber are required' }, { status: 400 });
    }

    const data = await loadSessionData(sessionId);
    if (!data) {
      return NextResponse.json({ message: 'unsupported sessionId' }, { status: 400 });
    }

    const problem = data.problems.find((p) => Number(p.problem_number) === problemNumber);
    if (!problem) {
      return NextResponse.json({ message: 'problem not found' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId,
      problemNumber,
      sectionTitle: problem.sectionTitle || '',
      questionText: problem.question_text || '',
      options: Array.isArray(problem.options) ? problem.options : [],
      answerText: data.answersMap[problem.problem_number] ?? '',
      commentText: data.commentsMap[problem.problem_number] ?? '',
      gotoPath: `/test/${sessionId}`,
    });
  } catch {
    return NextResponse.json({ message: 'failed to load problem detail' }, { status: 500 });
  }
}
