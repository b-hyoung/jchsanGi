"""툴 호출 디스패치 — 보안 로직 중앙집중.

모든 툴 호출은 여기를 거침. 책임:
1. JSON 인자 파싱 실패 방어
2. 유저 스코프 툴에 user_email 강제 주입 (서버 세션 값으로 덮어씀)
3. 출력 툴은 UI 이벤트 생성 + 세션 상태 업데이트
4. 예외를 {"error": ...} 로 변환하여 에이전트 루프가 복구할 수 있게
"""
import json
import logging
from typing import Any

from ..agent.schemas import USER_SCOPED_TOOLS, OUTPUT_TOOLS
from .question import get_question_detail
from .user_history import get_user_wrong_history, get_user_topic_stats
from .output_tools import handle_present_similar_problem, handle_submit_evaluation

logger = logging.getLogger(__name__)


async def dispatch_tool(tool_call, user_email: str, session, ui_actions: list) -> dict[str, Any]:
    name = tool_call.function.name
    raw_args = tool_call.function.arguments

    try:
        args = json.loads(raw_args) if raw_args else {}
    except json.JSONDecodeError as e:
        logger.warning("invalid JSON args for %s: %s", name, e)
        return {"error": f"invalid tool arguments JSON: {e}"}

    # 보안: 유저 스코프 툴은 user_email 덮어씀
    if name in USER_SCOPED_TOOLS:
        args["user_email"] = user_email

    try:
        if name == "get_question_detail":
            return await get_question_detail(
                source_session_id=args["source_session_id"],
                problem_number=int(args["problem_number"]),
            )
        if name == "get_user_wrong_history":
            return await get_user_wrong_history(
                user_email=args["user_email"],
                source_session_id=args["source_session_id"],
                problem_number=int(args["problem_number"]),
            )
        if name == "get_user_topic_stats":
            return await get_user_topic_stats(
                user_email=args["user_email"],
                category=args.get("category"),
            )
        if name == "present_similar_problem":
            return handle_present_similar_problem(args, session, ui_actions)
        if name == "submit_evaluation":
            return handle_submit_evaluation(args, session, ui_actions)

        return {"error": f"unknown tool: {name}"}

    except Exception as e:  # noqa: BLE001
        logger.warning("tool %s failed: %s", name, e, exc_info=True)
        return {"error": str(e)[:200]}
