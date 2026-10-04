import logging
from app.db.session import get_pool

logger = logging.getLogger(__name__)

DDL = """
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(64),
    name VARCHAR(255),
    hashed_password TEXT,
    onboarded BOOLEAN DEFAULT FALSE,
    appLang VARCHAR(64) DEFAULT 'English',
    village TEXT DEFAULT '',
    district TEXT DEFAULT '',
    state TEXT DEFAULT '',
    crops TEXT DEFAULT '',
    interests JSONB DEFAULT '[]'::jsonb,
    flow_stage VARCHAR(128) DEFAULT 'Land Preparation',
    nitrogen NUMERIC DEFAULT 80.0,
    phosphorus NUMERIC DEFAULT 40.0,
    potassium NUMERIC DEFAULT 40.0,
    ph NUMERIC DEFAULT 6.5,
    expo_push_token TEXT,
    daily_monitoring_logs JSONB DEFAULT '[]'::jsonb,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS otps (
    identifier VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    otp VARCHAR(16) NOT NULL,
    expires_at DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (identifier, purpose)
);

CREATE TABLE IF NOT EXISTS chat_conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title TEXT,
    archived BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_message_preview TEXT DEFAULT '',
    last_message JSONB,
    created_at TEXT,
    updated_at TEXT,
    data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated ON chat_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64),
    role VARCHAR(32) NOT NULL,
    content TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    language VARCHAR(64) DEFAULT 'English',
    source VARCHAR(64) DEFAULT 'text',
    created_at TEXT,
    feedback VARCHAR(32),
    data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_conv ON chat_messages(user_id, conversation_id);

CREATE TABLE IF NOT EXISTS agri_flow_plans (
    plan_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    status VARCHAR(64) DEFAULT 'active',
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agri_flow_plans_user ON agri_flow_plans(user_id);

CREATE TABLE IF NOT EXISTS agri_flow_updates (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64),
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agri_flow_stage_tests (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agri_flow_task_logs (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farming_plans (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    timestamp DOUBLE PRECISION DEFAULT 0,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farming_plans_user ON farming_plans(user_id);
"""

MIGRATION_DDL = """
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT DEFAULT '';

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS language VARCHAR(64) DEFAULT 'English';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS source VARCHAR(64) DEFAULT 'text';

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated ON chat_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_conv ON chat_messages(user_id, conversation_id);
"""


async def init_db() -> None:
    """Initialize Neon PostgreSQL schema tables and indexes."""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(DDL)
            await conn.execute(MIGRATION_DDL)
        logger.info("Neon PostgreSQL schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not auto-initialize schema on startup: {e}")
