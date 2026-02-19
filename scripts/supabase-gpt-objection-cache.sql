-- GPT objection cache table
-- Run this in Supabase SQL Editor.

create table if not exists public.gpt_objection_cache (
  id bigserial primary key,
  cache_key text not null unique,
  source_session_id text not null,
  source_problem_number integer not null,
  user_question text,
  question_text text,
  options jsonb,
  selected_answer text,
  correct_answer text,
  explanation_text text,
  answer text not null,
  hit_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_gpt_objection_cache_source
  on public.gpt_objection_cache (source_session_id, source_problem_number);

create index if not exists idx_gpt_objection_cache_created_at
  on public.gpt_objection_cache (created_at desc);

