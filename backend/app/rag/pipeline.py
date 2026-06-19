from app.rag.loader import load_documents
from app.rag.chunking import chunk_text
from app.rag.retriever import retrieve


def run_pipeline(source: str, query: str) -> dict:
    docs = load_documents(source)
    chunks = [c for d in docs for c in chunk_text(d)]
    ctx = retrieve(query)
    return {"chunks": chunks, "context": ctx}
