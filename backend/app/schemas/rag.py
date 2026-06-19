from pydantic import BaseModel
from typing import Optional


class RAGQuery(BaseModel):
    query: str
    source: Optional[str] = "knowledge_base"
