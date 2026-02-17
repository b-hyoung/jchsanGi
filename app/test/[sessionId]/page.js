import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from './Quiz';

async function fetchQuizDataFromPath(basePath) {
  try {
    const problemStr = await fs.readFile(path.join(basePath, 'problem1.json'), 'utf8').catch(async (error) => {
      if (error?.code === 'ENOENT') {
        return fs.readFile(path.join(basePath, 'problem1.temp3.json'), 'utf8');
      }
      throw error;
    });

    const [answerStr, commentStr] = await Promise.all([
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
        acc[c.problem_number] = c.comment ?? c.comment_text ?? "";
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
  } else if (sessionId === '4' || sessionId === '2') {
    basePath = path.join(process.cwd(), 'problem2024', 'second');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '5' || sessionId === '3') {
    basePath = path.join(process.cwd(), 'problem2024', 'third');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '6') {
    basePath = path.join(process.cwd(), 'problem2023', 'first');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '7') {
    basePath = path.join(process.cwd(), 'problem2023', 'second');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '8') {
    basePath = path.join(process.cwd(), 'problem2023', 'third');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '9') {
    basePath = path.join(process.cwd(), 'problem2022', 'first');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '10') {
    basePath = path.join(process.cwd(), 'problem2022', 'second');
    return fetchQuizDataFromPath(basePath);
  } else if (sessionId === '11') {
    basePath = path.join(process.cwd(), 'problem2022', 'third');
    return fetchQuizDataFromPath(basePath);
  }
  return null;
}

const sessionDetails = {
  1: { title: '정보처리산업기사 2024년 1회' },
  2: { title: '정보처리산업기사 2024년 2회' },
  3: { title: '정보처리산업기사 2024년 3회' },
  4: { title: '정보처리산업기사 2024년 2회' },
  5: { title: '정보처리산업기사 2024년 3회' },
  6: { title: '정보처리산업기사 2023년 1회' },
  7: { title: '정보처리산업기사 2023년 2회' },
  8: { title: '정보처리산업기사 2023년 3회' },
  9: { title: '정보처리산업기사 2022년 1회' },
  10: { title: '정보처리산업기사 2022년 2회' },
  11: { title: '정보처리산업기사 2022년 3회' },
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
