from __future__ import annotations

import datetime as dt
import re
import uuid
from dataclasses import dataclass
from typing import Any, Optional

from pymongo import ASCENDING, DESCENDING

from app.db.session import db

UTC = dt.timezone.utc
_indexes_ready = False


@dataclass
class ChatMessageModel:
    message_id: str
    role: str
    content: str
    language: str
    source: str
    created_at: dt.datetime


def _utc_now() -> dt.datetime:
    return dt.datetime.now(UTC)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _iso(value: dt.datetime | None) -> str:
    if not value:
        return _utc_now().isoformat()
    return value.astimezone(UTC).isoformat()


def _message_to_dict(message: ChatMessageModel) -> dict[str, Any]:
    return {
        "message_id": message.message_id,
        "role": message.role,
        "content": message.content,
        "language": message.language,
        "source": message.source,
        "created_at": message.created_at,
    }


def build_chat_title(text: str) -> str:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return "New chat"

    # Use the first sentence as title base to keep titles short and meaningful.
    first_sentence = re.split(r"[.!?\n]", cleaned, maxsplit=1)[0].strip(" -:;,")
    words = first_sentence.split()
    if not words:
        return "New chat"

    max_words = 7
    max_chars = 48
    short = " ".join(words[:max_words]).strip()
    short = short[:max_chars].rstrip(" -:;,")
    if len(words) > max_words and len(short) < max_chars - 3:
        short = f"{short}..."

    if not short:
        return "New chat"

    return short[0].upper() + short[1:]


def serialize_message(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "message_id": doc["message_id"],
        "role": doc["role"],
        "content": doc["content"],
        "language": doc.get("language", "English"),
        "source": doc.get("source", "text"),
        "created_at": _iso(doc.get("created_at")),
    }


def serialize_conversation(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "conversation_id": doc["conversation_id"],
        "title": doc.get("title", "New chat"),
        "last_message_preview": doc.get("last_message_preview", ""),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
    }


async def ensure_chat_indexes() -> None:
    global _indexes_ready
    if _indexes_ready:
        return

    await db.chat_conversations.create_index(
        [("user_id", ASCENDING), ("updated_at", DESCENDING), ("is_deleted", ASCENDING)]
    )
    await db.chat_conversations.create_index(
        [("user_id", ASCENDING), ("conversation_id", ASCENDING)], unique=True
    )
    await db.chat_messages.create_index(
        [("conversation_id", ASCENDING), ("created_at", ASCENDING)]
    )
    await db.chat_messages.create_index(
        [("user_id", ASCENDING), ("conversation_id", ASCENDING)]
    )
    _indexes_ready = True


async def create_conversation(user_id: str, title: str | None = None) -> dict[str, Any]:
    now = _utc_now()
    conversation = {
        "conversation_id": _new_id("conv"),
        "user_id": user_id,
        "title": (title or "New chat").strip()[:80] or "New chat",
        "last_message_preview": "",
        "created_at": now,
        "updated_at": now,
        "is_deleted": False,
    }
    await db.chat_conversations.insert_one(conversation)
    return conversation


async def get_conversation(user_id: str, conversation_id: str) -> Optional[dict[str, Any]]:
    return await db.chat_conversations.find_one(
        {"conversation_id": conversation_id, "user_id": user_id, "is_deleted": False}
    )


async def update_conversation_title(user_id: str, conversation_id: str, title: str) -> bool:
    result = await db.chat_conversations.update_one(
        {"conversation_id": conversation_id, "user_id": user_id, "is_deleted": False},
        {"$set": {"title": title.strip()[:80] or "New chat", "updated_at": _utc_now()}},
    )
    return result.modified_count > 0


async def soft_delete_conversation(user_id: str, conversation_id: str) -> bool:
    now = _utc_now()
    conversation_result = await db.chat_conversations.update_one(
        {"conversation_id": conversation_id, "user_id": user_id, "is_deleted": False},
        {"$set": {"is_deleted": True, "updated_at": now}},
    )
    if conversation_result.modified_count == 0:
        return False

    await db.chat_messages.update_many(
        {"conversation_id": conversation_id, "user_id": user_id, "is_deleted": {"$ne": True}},
        {"$set": {"is_deleted": True}},
    )
    return True


async def append_message(
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
    language: str,
    source: str,
) -> dict[str, Any]:
    message = ChatMessageModel(
        message_id=_new_id("msg"),
        role=role,
        content=content,
        language=language,
        source=source,
        created_at=_utc_now(),
    )
    message_doc = {
        **_message_to_dict(message),
        "conversation_id": conversation_id,
        "user_id": user_id,
        "is_deleted": False,
    }
    await db.chat_messages.insert_one(message_doc)

    normalized_content = content.strip().replace("\n", " ")
    preview = normalized_content[:140]
    update_payload: dict[str, Any] = {"updated_at": message.created_at}
    if role == "user":
        update_payload["last_message_preview"] = preview

    await db.chat_conversations.update_one(
        {"conversation_id": conversation_id, "user_id": user_id, "is_deleted": False},
        {"$set": update_payload},
    )

    # Auto-title only untouched chats so first user message gives an instant meaningful title.
    if role == "user":
        auto_title = build_chat_title(normalized_content)
        await db.chat_conversations.update_one(
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "is_deleted": False,
                "title": {"$in": ["", "New chat"]},
            },
            {"$set": {"title": auto_title}},
        )

    return message_doc


async def list_conversations(user_id: str, skip: int, limit: int) -> tuple[list[dict[str, Any]], int]:
    query = {"user_id": user_id, "is_deleted": False}
    total = await db.chat_conversations.count_documents(query)
    cursor = db.chat_conversations.find(query).sort("updated_at", DESCENDING).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    return items, total


async def list_messages(
    user_id: str,
    conversation_id: str,
    skip: int,
    limit: int,
    before_created_at: Optional[dt.datetime] = None,
) -> tuple[list[dict[str, Any]], int, Optional[str]]:
    query: dict[str, Any] = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "is_deleted": {"$ne": True},
    }
    if before_created_at is not None:
        query["created_at"] = {"$lt": before_created_at}

    total = await db.chat_messages.count_documents(query)

    cursor = db.chat_messages.find(query).sort("created_at", DESCENDING)
    if before_created_at is None:
        cursor = cursor.skip(skip)
    cursor = cursor.limit(limit)

    items = await cursor.to_list(length=limit)
    next_cursor = None
    if items and len(items) == limit:
        tail = items[-1].get("created_at")
        if isinstance(tail, dt.datetime):
            next_cursor = tail.astimezone(UTC).isoformat()

    return items, total, next_cursor


async def search_conversations(user_id: str, search: str, limit: int = 20) -> list[dict[str, Any]]:
    regex = {"$regex": search, "$options": "i"}
    pipeline = [
        {"$match": {"user_id": user_id, "is_deleted": False}},
        {
            "$lookup": {
                "from": "chat_messages",
                "let": {"conversation_id": "$conversation_id", "user_id": "$user_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$conversation_id", "$$conversation_id"]},
                                    {"$eq": ["$user_id", "$$user_id"]},
                                ]
                            },
                            "is_deleted": {"$ne": True},
                            "content": regex,
                        }
                    },
                    {"$limit": 1},
                ],
                "as": "message_matches",
            }
        },
        {
            "$match": {
                "$or": [
                    {"title": regex},
                    {"last_message_preview": regex},
                    {"message_matches": {"$ne": []}},
                ]
            }
        },
        {"$project": {"message_matches": 0}},
        {"$sort": {"updated_at": -1}},
        {"$limit": limit},
    ]
    return await db.chat_conversations.aggregate(pipeline).to_list(length=limit)
