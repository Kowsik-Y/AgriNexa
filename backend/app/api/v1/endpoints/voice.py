import os
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.security import get_current_user
from app.models.chat import append_message, create_conversation, ensure_chat_indexes, get_conversation

router = APIRouter(tags=["Voice"])


@router.post("/voice-query")
async def voice_query_endpoint(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(default=None),
    language: str = Form(default="English"),
    current_user: str = Depends(get_current_user),
) -> dict:
    await ensure_chat_indexes()

    conversation = None
    if conversation_id:
        conversation = await get_conversation(current_user, conversation_id)
    if not conversation:
        conversation = await create_conversation(current_user, "Voice chat")

    temp_path = f"tmp_{file.filename}"
    with open(temp_path, "wb") as temp_file:
        temp_file.write(await file.read())

    try:
        from ai.voice_ai import voice_ai

        result = voice_ai.transcribe_and_respond(temp_path)
    except Exception:
        result = {
            "transcript": "Voice AI module unavailable",
            "response": "Voice processing is not configured in this deployment.",
            "status": "fallback",
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    transcript = result.get("transcription") or result.get("transcript") or ""
    response = result.get("response") or ""

    if transcript.strip():
        await append_message(
            user_id=current_user,
            conversation_id=conversation["conversation_id"],
            role="user",
            content=transcript,
            language=language,
            source="voice",
        )

    if response.strip():
        await append_message(
            user_id=current_user,
            conversation_id=conversation["conversation_id"],
            role="assistant",
            content=response,
            language=language,
            source="voice",
        )

    result["conversation_id"] = conversation["conversation_id"]
    result["transcription"] = transcript

    return result
