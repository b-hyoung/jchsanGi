import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from './Quiz';

async function fetchQuizDataFromPath(basePath) {
  try {
    const [problemStr, answerStr, commentStr] = await Promise.all([
      fs.readFile(path.join(basePath, 'problem1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'answer1.json'), 'utf8'),
      fs.readFile(path.join(basePath, 'comment1.json'), 'utf8')
    ]);

    const problemData = JSON.parse(problemStr);
    const answerData = JSON.parse(answerStr);
    const commentData = JSON.parse(commentStr);

    const problems = problemData.reduce((acc, section) => {
      const problemsWithSection = section.problems.map(p => ({ ...p, sectionTitle: section.title }));
      return acc.concat(problemsWithSection);
    }, []);

    const answersMap = answerData.reduce((acc, section) => {
      section.answers.forEach(a => {
        acc[a.problem_number] = a.correct_answer_text;
      });
      return acc;
    }, {});

    const commentsMap = commentData.reduce((acc, section) => {
      section.comments.forEach(c => {
        acc[c.problem_number] = c.comment;
      });
      return acc;
    }, {});

    return { problems, answersMap, commentsMap };
  } catch (error) {
    console.error("Failed to read or parse quiz files:", error);
    return null;
  }
}

async function getQuizData(sessionId) {
  let basePath;
  if (sessionId === '1') {
    basePath = path.join(process.cwd(), 'problem2024', 'first');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '4') { // New session added
    basePath = path.join(process.cwd(), 'problem2024', 'second');
    return fetchQuizDataFromPath(basePath);
  }
  return null;
}

const sessionDetails = {
  1: { title: '정보처리산업기사 2024년 1회' },
  4: { title: '정보처리산업기사 2024년 2회' }, // Added 2024년 2회 session
};

// Reverting to an async component, but using `await` on params, which seems to be
// the required pattern for this experimental version of Next.js.
export default async function TestPage({ params: paramsPromise }) {
  // Await the promise to get the actual params object
  const params = await paramsPromise;
  const { sessionId } = params;

  const data = await getQuizData(sessionId);
  const session = sessionDetails[sessionId];

  if (!data || !session) {
    notFound();
  }

  // Pass the server-fetched problems directly to the client component.
  return <Quiz problems={data.problems} answersMap={data.answersMap} commentsMap={data.commentsMap} session={session} />;
}
