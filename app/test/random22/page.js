import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from '../[sessionId]/Quiz';

export const dynamic = 'force-dynamic';

const SOURCES = [
  { key: '2022-1', sessionId: '9', basePath: ['datasets', 'problem2022', 'first'] },
  { key: '2022-2', sessionId: '10', basePath: ['datasets', 'problem2022', 'second'] },
  { key: '2022-3', sessionId: '11', basePath: ['datasets', 'problem2022', 'third'] },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function subjectOf(problemNumber) {
  if (problemNumber >= 1 && problemNumber <= 20) return 1;
  if (problemNumber >= 21 && problemNumber <= 40) return 2;
  return 3;
}

function sectionTitleOf(subject) {
  if (subject === 1) return '정보시스템 기반 기술';
  if (subject === 2) return '프로그래밍 언어 활용';
  return '데이터베이스의 활용';
}

async function readSessionData(source) {
  const basePath = path.join(process.cwd(), ...source.basePath);
  const problemStr = await fs.readFile(path.join(basePath, 'problem1.json'), 'utf8');
  const [answerStr, commentStr] = await Promise.all([
    fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
    fs.readFile(path.join(basePath, 'comment1.json'), 'utf8'),
  ]);

  const stripBom = (s) => String(s || '').replace(/^\uFEFF/, '');
  const problemData = JSON.parse(stripBom(problemStr));
  const answerData = JSON.parse(stripBom(answerStr));
  const commentData = JSON.parse(stripBom(commentStr));

  const answersMap = answerData.reduce((acc, section) => {
    section.answers.forEach((a) => {
      acc[a.problem_number] = a.correct_answer_text;
    });
    return acc;
  }, {});

  const commentsMap = commentData.reduce((acc, section) => {
    section.comments.forEach((c) => {
      acc[c.problem_number] = c.comment ?? c.comment_text ?? '';
    });
    return acc;
  }, {});

  const flatProblems = problemData.flatMap((section) => section.problems);

  return flatProblems.map((p) => ({
    sourceKey: source.key,
    sourceSessionId: source.sessionId,
    problem_number: p.problem_number,
    question_text: p.question_text,
    options: p.options,
    answer_text: answersMap[p.problem_number],
    comment_text: commentsMap[p.problem_number] ?? '',
  }));
}

function shuffledOptionsAndAnswer(options, answerText) {
  const withIndex = options.map((text, idx) => ({ text, idx }));
  const shuffled = shuffle(withIndex);
  return {
    options: shuffled.map((x) => x.text),
    answerText,
  };
}

async function buildRandom22QuizData() {
  const allBySession = await Promise.all(SOURCES.map(readSessionData));
  const merged = allBySession.flat();
  const selectedBySubject = { 1: [], 2: [], 3: [] };

  for (const subject of [1, 2, 3]) {
    const pool = merged.filter((p) => subjectOf(p.problem_number) === subject);
    if (pool.length < 20) {
      throw new Error(`Not enough questions for subject ${subject}`);
    }
    selectedBySubject[subject] = shuffle(pool).slice(0, 20);
  }

  const ordered = [
    ...shuffle(selectedBySubject[1]),
    ...shuffle(selectedBySubject[2]),
    ...shuffle(selectedBySubject[3]),
  ];

  const problems = [];
  const answersMap = {};
  const commentsMap = {};

  ordered.forEach((item, idx) => {
    const newNo = idx + 1;
    const subject = idx < 20 ? 1 : idx < 40 ? 2 : 3;
    const { options: shuffledOpts, answerText } = shuffledOptionsAndAnswer(item.options, item.answer_text);

    problems.push({
      problem_number: newNo,
      question_text: `[보기셔플][${item.sourceKey}] ${item.question_text}`,
      options: shuffledOpts,
      sectionTitle: sectionTitleOf(subject),
      originSessionId: item.sourceSessionId,
      originProblemNumber: item.problem_number,
      originSourceKey: item.sourceKey,
    });
    answersMap[newNo] = answerText;
    commentsMap[newNo] = item.comment_text;
  });

  return { problems, answersMap, commentsMap };
}

export default async function Random22TestPage() {
  let data;
  try {
    data = await buildRandom22QuizData();
  } catch (error) {
    console.error('Failed to build random22 quiz:', error);
    notFound();
  }
  const session = { title: '랜덤22 보기 셔플 테스트 (2022년 데이터 기반)' };
  return (
    <Quiz
      problems={data.problems}
      answersMap={data.answersMap}
      commentsMap={data.commentsMap}
      session={session}
      sessionId="random22"
    />
  );
}

