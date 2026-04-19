import fs from 'fs/promises';
import path from 'path';
import { fetchUserFinishEvents } from '@/lib/userProblemsStore';

const DATASETS_ROOT = path.join(process.cwd(), 'datasets', 'practicalIndustrial');

async function loadAllProblems() {
  // (sessionId, problemNumber) -> {category, subcategory, question_preview}
  const map = new Map();
  try {
    const entries = await fs.readdir(DATASETS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionId = entry.name;
      const problemFile = path.join(DATASETS_ROOT, sessionId, 'problem1.json');
      try {
        const raw = await fs.readFile(problemFile, 'utf8');
        const data = JSON.parse(raw);
        const problems = data?.[0]?.problems || [];
        for (const p of problems) {
          const pnum = Number(p.problem_number);
          if (!Number.isFinite(pnum)) continue;
          // SQL 문제: 실제 쿼리(QUERY) vs 이론(THEORY) 자동 분류
          let subcategory = p.subcategory || null;
          if (p.category === 'SQL' && !subcategory) {
            const text = `${p.question_text || ''} ${p.examples || ''}`;
            const hasSqlKeyword = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE|JOIN|GROUP\s+BY|ORDER\s+BY|HAVING)\b/i.test(text);
            subcategory = hasSqlKeyword ? 'QUERY' : 'THEORY';
          }
          map.set(`${sessionId}:${pnum}`, {
            category: p.category || null,
            subcategory,
            question_preview: String(p.question_text || '').slice(0, 50),
          });
        }
      } catch {
        // skip
      }
    }
  } catch {
    // dataset root missing
  }
  return map;
}

export async function getUserWrongProblemsByCategory(userEmail, category) {
  const events = await fetchUserFinishEvents(userEmail);
  const problemsMap = await loadAllProblems();

  // 2-pass latest-wins (사용자 문제별 최신 outcome 만)
  const latestForKey = new Map();
  const timestampForKey = new Map();
  for (const ev of events) {
    const outcomes = ev?.payload?.problemOutcomes || [];
    for (const o of outcomes) {
      const sid = String(o?.sessionId || '').trim();
      const pnum = Number(o?.problemNumber);
      if (!sid || !Number.isFinite(pnum)) continue;
      const key = `${sid}:${pnum}`;
      if (latestForKey.has(key)) continue;
      latestForKey.set(key, o);
      timestampForKey.set(key, ev?.timestamp || '');
    }
  }

  const rows = [];
  for (const [key, o] of latestForKey.entries()) {
    if (o?.isCorrect || o?.isUnknown) continue;
    const meta = problemsMap.get(key);
    if (!meta) continue;
    if (meta.category !== category) continue;
    const [sourceSessionId, pnumStr] = key.split(':');
    rows.push({
      source_session_id: sourceSessionId,
      problem_number: Number(pnumStr),
      category: meta.category,
      subcategory: meta.subcategory,
      question_preview: meta.question_preview,
      last_attempt_at: timestampForKey.get(key) || null,
    });
  }

  rows.sort((a, b) => String(b.last_attempt_at || '').localeCompare(String(a.last_attempt_at || '')));
  return rows;
}
