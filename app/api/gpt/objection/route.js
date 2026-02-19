import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_GPT_CACHE_TABLE = process.env.SUPABASE_GPT_CACHE_TABLE || 'gpt_objection_cache';

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseRestUrl() {
  return `${SUPABASE_URL}/rest/v1/${SUPABASE_GPT_CACHE_TABLE}`;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildCacheKey({
  sourceSessionId,
  sourceProblemNumber,
  selectedAnswer = '',
  correctAnswer = '',
  history,
}) {
  const historyKey = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => `${m.role}:${normalizeText(m.content)}`)
        .join('|')
    : '';
  const raw = [
    String(sourceSessionId),
    String(sourceProblemNumber),
    `selected:${normalizeText(selectedAnswer)}`,
    `correct:${normalizeText(correctAnswer)}`,
    historyKey,
  ].join('::');
  return createHash('sha256').update(raw).digest('hex');
}

function extractAnswerText(data) {
  // 1) Preferred convenience field
  const direct = String(data?.output_text || '').trim();
  if (direct) return direct;

  // 2) Walk output[] -> content[] -> text
  const output = Array.isArray(data?.output) ? data.output : [];
  const chunks = [];
  for (const item of output) {
    const contents = Array.isArray(item?.content) ? item.content : [];
    for (const c of contents) {
      if (typeof c?.text === 'string' && c.text.trim()) chunks.push(c.text.trim());
      if (typeof c?.output_text === 'string' && c.output_text.trim()) chunks.push(c.output_text.trim());
    }
  }
  if (chunks.length > 0) return chunks.join('\n\n');

  // 3) Refusal fallback
  const refusal = output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .find((c) => typeof c?.refusal === 'string' && c.refusal.trim());
  if (refusal?.refusal) return refusal.refusal.trim();

  return '';
}

async function readCache(cacheKey) {
  if (!hasSupabaseConfig()) return null;
  const url = `${supabaseRestUrl()}?select=cache_key,answer,hit_count&cache_key=eq.${cacheKey}&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: supabaseHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`cache read failed: ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0];
}

async function bumpCacheHit(cacheKey, currentHit = 0) {
  if (!hasSupabaseConfig()) return;
  await fetch(`${supabaseRestUrl()}?cache_key=eq.${cacheKey}`, {
    method: 'PATCH',
    headers: supabaseHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ hit_count: Number(currentHit || 0) + 1 }),
  });
}

async function writeCache({
  cacheKey,
  sourceSessionId,
  sourceProblemNumber,
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  explanationText,
  userQuestion,
  answer,
}) {
  if (!hasSupabaseConfig()) return;
  const payload = {
    cache_key: cacheKey,
    source_session_id: String(sourceSessionId || ''),
    source_problem_number: Number(sourceProblemNumber || 0),
    user_question: String(userQuestion || ''),
    question_text: String(questionText || ''),
    options: Array.isArray(options) ? options : [],
    selected_answer: String(selectedAnswer || ''),
    correct_answer: String(correctAnswer || ''),
    explanation_text: String(explanationText || ''),
    answer: String(answer || ''),
    hit_count: 1,
  };
  await fetch(supabaseRestUrl(), {
    method: 'POST',
    headers: supabaseHeaders({
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    }),
    body: JSON.stringify(payload),
  });
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: 'OPENAI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      sourceSessionId = '',
      sourceProblemNumber = '',
      questionText = '',
      options = [],
      selectedAnswer = '',
      correctAnswer = '',
      explanationText = '',
      history = [],
    } = body || {};

    const lastUserQuestion = Array.isArray(history)
      ? [...history].reverse().find((m) => m?.role === 'user')?.content || ''
      : '';

    const cacheKey = buildCacheKey({
      sourceSessionId,
      sourceProblemNumber,
      selectedAnswer,
      correctAnswer,
      history,
    });

    try {
      const cached = await readCache(cacheKey);
      const cachedAnswer = String(cached?.answer || '').trim();
      if (cachedAnswer && cachedAnswer !== '답변이 비어 있습니다.') {
        await bumpCacheHit(cacheKey, cached.hit_count);
        return NextResponse.json({ ok: true, answer: cachedAnswer, cached: true });
      }
    } catch {
      // Continue without cache on cache errors.
    }

    const chatHistory = Array.isArray(history)
      ? history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
          .map((m) => `${m.role === 'user' ? '사용자' : 'GPT'}: ${String(m.content || '')}`)
          .join('\n\n')
      : '';

    const prompt = [
      '사용자는 한국어 객관식 시험 문제를 푸는 중이다.',
      '문제/선택지/정답/해설을 바탕으로 왜 정답인지 이해하기 쉽게 설명하라.',
      '반드시 한국어로, 아래 4개 항목 형식으로 답하라:',
      '1) 정답 근거',
      '2) 헷갈린 포인트',
      '3) 오답이 틀린 이유',
      '4) 한 줄 암기',
      '',
      '[문제]',
      String(questionText),
      '',
      '[선택지]',
      Array.isArray(options) ? options.map((opt, i) => `${i + 1}. ${String(opt)}`).join('\n') : '',
      '',
      `[사용자 선택] ${String(selectedAnswer || '없음')}`,
      `[정답] ${String(correctAnswer || '없음')}`,
      '',
      '[기존 해설]',
      String(explanationText || '없음'),
      '',
      '[대화 이력]',
      chatHistory || '없음',
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt,
        max_output_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { ok: false, message: 'OpenAI request failed', detail: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const answer = extractAnswerText(data);
    const safeAnswer = answer || '답변을 생성하지 못했습니다. 질문을 조금 더 구체적으로 다시 보내주세요.';

    try {
      await writeCache({
        cacheKey,
        sourceSessionId,
        sourceProblemNumber,
        questionText,
        options,
        selectedAnswer,
        correctAnswer,
        explanationText,
        userQuestion: lastUserQuestion,
        answer: safeAnswer,
      });
    } catch {
      // Ignore cache write failures.
    }

    return NextResponse.json({ ok: true, answer: safeAnswer, cached: false });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: 'failed to process objection', detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
