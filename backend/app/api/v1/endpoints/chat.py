import datetime as dt
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.models.chat import (
    append_message,
    build_chat_title,
    create_conversation,
    ensure_chat_indexes,
    get_conversation,
    list_conversations,
    list_messages,
    search_conversations,
    serialize_conversation,
    serialize_message,
    soft_delete_conversation,
    update_conversation_title,
)
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatSendRequest,
    ChatSendResponse,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationRenameRequest,
    ConversationSearchResponse,
)
from app.api.v1.endpoints.weather_utils import ADVICE_MAP, weather_snapshot
from app.services.agent_service import AgentService
from app.services.llm_service import LLMService
from app.services.rag_service import RAGService
from app.services.tool_router_service import ToolRouterService

router = APIRouter()
llm_service = LLMService()
rag_service = RAGService()
agent_service = AgentService()
tool_router = ToolRouterService()


def _normalize_space(text: str) -> str:
    return " ".join(text.split()).strip()


def _extract_location(text: str) -> Optional[str]:
    cleaned = _normalize_space(text)
    if not cleaned:
        return None

    # Example: weather in sathyamagalam, rain at coimbatore, forecast for erode
    match = re.search(r"\b(?:in|at|for)\s+([a-zA-Z\s]{2,60})$", cleaned, flags=re.IGNORECASE)
    if match:
        location = _normalize_space(match.group(1))
        if location and any(ch.isalpha() for ch in location):
            return location

    # Example: sathyamagalam weather
    match = re.search(r"^([a-zA-Z\s]{2,60})\s+(?:weather|forecast)$", cleaned, flags=re.IGNORECASE)
    if match:
        location = _normalize_space(match.group(1))
        if location and any(ch.isalpha() for ch in location):
            return location

    return None


def _build_weather_reply(location: str) -> str:
    day_key = dt.datetime.utcnow().strftime("%Y-%m-%d")
    seed = f"weather:{location.lower()}:{day_key}"
    snapshot = weather_snapshot(seed)
    advice = ADVICE_MAP.get(snapshot["condition"], "Normal farming conditions.")
    return (
        f"Today's weather in {location.title()}: {snapshot['temp']}°C, "
        f"{snapshot['condition']}, humidity {snapshot['humidity']}%, "
        f"rain chance {snapshot['rain_chance']}%. {advice}"
    )


@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    if payload.use_rag:
        answer = await rag_service.answer(payload.message)
        return ChatResponse(answer=answer, source="rag")

    answer = await llm_service.generate(payload.message)
    return ChatResponse(answer=answer, source="llm")


@router.post("/messages", response_model=ChatSendResponse)
async def send_message(payload: ChatSendRequest, current_user: str = Depends(get_current_user)) -> ChatSendResponse:
    await ensure_chat_indexes()

    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    conversation = None
    recent_messages: list[dict] = []
    if payload.conversation_id:
        conversation = await get_conversation(current_user, payload.conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        recent_messages, _, _ = await list_messages(
            current_user,
            payload.conversation_id,
            skip=0,
            limit=8,
        )

    if not conversation:
        generated_title = build_chat_title(query)
        conversation = await create_conversation(current_user, generated_title)

    await append_message(
        user_id=current_user,
        conversation_id=conversation["conversation_id"],
        role="user",
        content=query,
        language=payload.language,
        source="text",
    )

    recent_user_messages = [
        msg.get("content", "")
        for msg in recent_messages
        if msg.get("role") == "user" and isinstance(msg.get("content"), str)
    ]
    tool_call = await tool_router.route_chat(
        query=query,
        recent_user_messages=recent_user_messages,
        use_rag=payload.use_rag,
    )

    if tool_call["tool"] == "weather":
        weather_location = tool_call.get("location") or _extract_location(query)
        if weather_location:
            answer = _build_weather_reply(weather_location)
            response_source = "rag"
        else:
            answer = (
                "Share your location (for example: Sathyamangalam) and I will give today's weather "
                "with farming advice."
            )
            response_source = "rag"
    elif tool_call["tool"] == "agent":
        agent_result = await agent_service.run(query)
        result_block = agent_result.get("result", {})
        answer = str(result_block.get("final_recommendation") or "I prepared an action plan.")
        response_source = "rag"
    elif tool_call["tool"] == "rag":
        answer = await rag_service.answer(query)
        response_source = "rag"
    else:
        answer = await llm_service.generate(query)
        response_source = "llm"

    assistant_message = await append_message(
        user_id=current_user,
        conversation_id=conversation["conversation_id"],
        role="assistant",
        content=answer,
        language=payload.language,
        source=response_source,
    )

    return ChatSendResponse(
        conversation_id=conversation["conversation_id"],
        response=answer,
        answer=answer,
        source=response_source,
        message=serialize_message(assistant_message),
    )


@router.post("/conversations")
async def create_user_conversation(current_user: str = Depends(get_current_user)) -> dict:
    await ensure_chat_indexes()
    conversation = await create_conversation(current_user)
    return {"conversation": serialize_conversation(conversation)}


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: str = Depends(get_current_user),
) -> ConversationListResponse:
    await ensure_chat_indexes()
    items, total = await list_conversations(current_user, skip, limit)
    return ConversationListResponse(
        conversations=[serialize_conversation(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/conversations/search", response_model=ConversationSearchResponse)
async def search_user_conversations(
    q: str = Query(min_length=1, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: str = Depends(get_current_user),
) -> ConversationSearchResponse:
    await ensure_chat_indexes()
    items = await search_conversations(current_user, q.strip(), limit)
    return ConversationSearchResponse(conversations=[serialize_conversation(item) for item in items])


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_messages(
    conversation_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    cursor: Optional[str] = Query(default=None),
    current_user: str = Depends(get_current_user),
) -> ConversationDetailResponse:
    await ensure_chat_indexes()
    conversation = await get_conversation(current_user, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    before_created_at = None
    if cursor:
        try:
            before_created_at = dt.datetime.fromisoformat(cursor.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid cursor") from exc

    messages, total, next_cursor = await list_messages(
        current_user,
        conversation_id,
        skip,
        limit,
        before_created_at=before_created_at,
    )
    ordered_messages = list(reversed(messages))
    return ConversationDetailResponse(
        conversation_id=conversation_id,
        title=conversation.get("title", "New chat"),
        messages=[serialize_message(message) for message in ordered_messages],
        total=total,
        skip=skip,
        limit=limit,
        next_cursor=next_cursor,
    )


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    payload: ConversationRenameRequest,
    current_user: str = Depends(get_current_user),
) -> dict:
    await ensure_chat_indexes()
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    updated = await update_conversation_title(current_user, conversation_id, payload.title)
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: str = Depends(get_current_user)) -> dict:
    await ensure_chat_indexes()
    deleted = await soft_delete_conversation(current_user, conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}
