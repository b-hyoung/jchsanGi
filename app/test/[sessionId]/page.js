import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import Quiz from './Quiz';

async function getProblems(sessionId) {
  if (sessionId === '1') {
    const filePath = path.join(process.cwd(), 'problem2024', 'first', 'problem1.json');
    try {
      const jsonString = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(jsonString);
      const allProblems = data.reduce((acc, section) => {
        const problemsWithSection = section.problems.map(p => ({ ...p, sectionTitle: section.title }));
        return acc.concat(problemsWithSection);
      }, []);
      return allProblems;
    } catch (error) {
      console.error("Failed to read or parse problem file:", error);
      return null;
    }
  }
  return null;
}

const sessionDetails = {
  1: { title: '정보처리산업기사 2024년 1회' },
  2: { title: '정보처리산업기사 2023년 3회' },
  3: { title: '정보처리산업기사 2023년 2회' },
};

// Reverting to an async component, but using `await` on params, which seems to be
// the required pattern for this experimental version of Next.js.
export default async function TestPage({ params: paramsPromise }) {
  // Await the promise to get the actual params object
  const params = await paramsPromise;
  const { sessionId } = params;

  const problems = await getProblems(sessionId);
  const session = sessionDetails[sessionId];

  if (!problems || !session) {
    notFound();
  }

  // Pass the server-fetched problems directly to the client component.
  return <Quiz problems={problems} session={session} />;
}
