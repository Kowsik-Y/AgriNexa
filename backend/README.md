# AgriNexa Backend

## Entry Point

- Primary app: `app/main.py`
- Compatibility launcher: `main.py`

## Run

```bash
source ./venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## OpenAI Setup (Chat + RAG)

Set these in `backend/.env`:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_OUTPUT_TOKENS=500
OPENAI_ESTIMATED_INPUT_TOKEN_BUDGET=2800
OPENAI_SHORT_MODE_OUTPUT_TOKENS=220
OPENAI_MAX_USER_PROMPT_CHARS=2200
RAG_MAX_CONTEXT_ITEMS=4
RAG_MAX_CONTEXT_CHARS=2400
RAG_MAX_ITEM_CHARS=700
```

- `OPENAI_BASE_URL` is optional and supports OpenAI-compatible providers.
- If not configured, chat services return a clear configuration message instead of mock answers.

## Structure

- `app/api/v1/endpoints` - HTTP routes
- `app/core` - config, security, logging
- `app/db` - Mongo session/client
- `app/models` - data access helpers
- `app/schemas` - request/response schemas
- `app/services` - business/domain logic
- `app/services/llm` - OpenAI-compatible client + prompt templates
- `app/rag`, `app/agents`, `app/ml`, `app/workers` - AI/ML and background modules

## Notes

- Agri-flow helper logic is split into `app/api/v1/endpoints/agri_flow_utils.py` to keep endpoint handlers focused and easier to maintain.
- Voice and some agri-flow AI calls use safe fallbacks when optional AI modules are unavailable.
