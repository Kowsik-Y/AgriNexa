class VectorStore:
    def add(self, chunks: list[str]) -> None:
        _ = chunks

    def search(self, query: str) -> list[str]:
        return [f"vector search result for: {query}"]
