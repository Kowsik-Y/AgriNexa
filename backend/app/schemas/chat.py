from typing import Literal, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    use_rag: bool = True
    user_id: Optional[str] = None


class ChatMessage(BaseModel):
    message_id: str
    role: Literal["user", "assistant"]
    content: str
    language: str = "English"
    source: Literal["text", "voice", "llm", "rag"] = "text"
    created_at: str


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    last_message_preview: str
    created_at: str
    updated_at: str


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    total: int
    skip: int
    limit: int


class ConversationDetailResponse(BaseModel):
    conversation_id: str
    title: str
    messages: list[ChatMessage]
    total: int
    skip: int
    limit: int
    next_cursor: Optional[str] = None


class ChatSendRequest(BaseModel):
    query: str
    language: str = "English"
    use_rag: bool = True
    conversation_id: Optional[str] = None


class ChatSendResponse(BaseModel):
    conversation_id: str
    response: str
    answer: str
    source: str = "llm"
    message: ChatMessage


class ConversationRenameRequest(BaseModel):
    title: str


class ConversationSearchResponse(BaseModel):
    conversations: list[ConversationSummary]


class ChatResponse(BaseModel):
    answer: str
    source: str = "llm"
