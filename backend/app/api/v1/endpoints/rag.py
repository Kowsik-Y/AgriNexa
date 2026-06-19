from fastapi import APIRouter

from app.schemas.rag import RAGQuery
from app.services.rag_service import RAGService

router = APIRouter()
service = RAGService()


@router.post("/query")
async def query_rag(payload: RAGQuery) -> dict:
    answer = await service.answer(payload.query)
    return {"answer": answer, "source": payload.source}
