import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "AgriNexa API")
    env: str = os.getenv("ENV", "development")
    mongodb_uri: str = os.getenv("MONGODB_URI", "")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "agrinexa")
    secret_key: str = os.getenv("SECRET_KEY", "agrinexa-secret-key-2026-very-secure-32chars")
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7)))
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
    openai_temperature: float = float(os.getenv("OPENAI_TEMPERATURE", "0.3"))
    openai_max_output_tokens: int = int(os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "500"))
    openai_estimated_input_token_budget: int = int(os.getenv("OPENAI_ESTIMATED_INPUT_TOKEN_BUDGET", "2800"))
    openai_short_mode_output_tokens: int = int(os.getenv("OPENAI_SHORT_MODE_OUTPUT_TOKENS", "220"))
    openai_max_user_prompt_chars: int = int(os.getenv("OPENAI_MAX_USER_PROMPT_CHARS", "2200"))
    rag_max_context_items: int = int(os.getenv("RAG_MAX_CONTEXT_ITEMS", "4"))
    rag_max_context_chars: int = int(os.getenv("RAG_MAX_CONTEXT_CHARS", "2400"))
    rag_max_item_chars: int = int(os.getenv("RAG_MAX_ITEM_CHARS", "700"))
    colab_stage_model_dir: str = os.getenv("COLAB_STAGE_MODEL_DIR", "app/services/ml_models/colab_imports")
    colab_stage_model_file: str = os.getenv("COLAB_STAGE_MODEL_FILE", "stage_model.pkl")


settings = Settings()
