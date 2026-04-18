"""get_user_wrong_history / get_user_topic_stats 툴.

analytics_events 테이블을 스캔해 특정 유저의 오답 이력을 재구성한다.
lib/userProblemsStore.js 의 "2-pass latest-wins" 규칙을 파이썬 포팅:
  1) 키(sessionId, problemNumber)별 최신 outcome 만 선택
  2) 최신이 정답이거나 '모름'이면 wrong_count 에서 제외
"""
from typing import Any
from urllib.parse import quote
from ..config import get_settings
from ..db.supabase_client import build_rest_url, get_json


async def fetch_user_finish_events(user_email: str) -> list[dict]:
    """analytics_events 에서 이 유저의 finish_exam 이벤트 전부 timestamp desc."""
    settings = get_settings()
    url = build_rest_url(settings.supabase_url, settings.supabase_events_table)
    contains_filter = f'{{"__meta":{{"userEmail":"{user_email}"}}}}'
    params = {
        "select": "payload,timestamp",
        "type": "eq.finish_exam",
        "payload": f"cs.{contains_filter}",
        "order": "timestamp.desc",
    }
    # Supabase Range 헤더 페이지네이션 (최대 1000/batch)
    all_events: list[dict] = []
    page_size = 1000
    start = 0
    while True:
        end = start + page_size - 1
        headers = {"Range": f"{start}-{end}", "Range-Unit": "items"}
        batch = await get_json(url, params=params, extra_headers=headers)
        if not batch:
            break
        all_events.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    return all_events


def reduce_wrong_history_from_events(
    events: list[dict],
    source_session_id: str,
    problem_number: int,
) -> dict:
    """events는 timestamp desc 순이어야 함 (최신이 먼저)."""
    all_for_problem: list[dict] = []
    latest_outcome_for_key: dict[tuple[str, int], dict] = {}

    for ev in events:
        outcomes = (ev.get("payload") or {}).get("problemOutcomes") or []
        for o in outcomes:
            sid = str(o.get("sessionId") or "").strip()
            pnum = o.get("problemNumber")
            if not isinstance(pnum, (int, float)):
                continue
            pnum = int(pnum)
            if sid != source_session_id or pnum != problem_number:
                continue
            key = (sid, pnum)
            all_for_problem.append({
                "submitted": str(o.get("submitted") or o.get("selected") or ""),
                "timestamp": ev.get("timestamp"),
                "isCorrect": bool(o.get("isCorrect")),
                "isUnknown": bool(o.get("isUnknown")),
            })
            if key not in latest_outcome_for_key:
                latest_outcome_for_key[key] = o

    latest = latest_outcome_for_key.get((source_session_id, problem_number))
    is_wrong_latest = bool(latest) and not latest.get("isCorrect") and not latest.get("isUnknown")

    return {
        "total_attempts": len(all_for_problem),
        "wrong_count": 1 if is_wrong_latest else 0,
        "recent_submissions": all_for_problem[:5],  # 최근 5개
    }


async def get_user_wrong_history(
    user_email: str,
    source_session_id: str,
    problem_number: int,
) -> dict:
    events = await fetch_user_finish_events(user_email)
    return reduce_wrong_history_from_events(events, source_session_id, problem_number)
