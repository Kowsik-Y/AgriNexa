# AgriNexa Backend Documentation

The AgriNexa backend is a high-performance RESTful API built on FastAPI and Python 3.10+. It orchestrates agronomic intelligence, machine learning model inferences, LangGraph agent workflows, real-time market data ingestion, and computer vision plant pathology.

---

## Architecture Overview

- **Web Framework**: FastAPI with asynchronous route handlers and Uvicorn ASGI server.
- **Relational Storage**: Neon Serverless PostgreSQL interfaced via high-efficiency asynchronous connection pooling (`asyncpg`).
- **AI Agentic Workflows**: LangGraph state graph engine with deterministic heuristic fallback support.
- **Machine Learning Inference**: Local Scikit-Learn (`RandomForestClassifier`), PyTorch (`GrowthStageNet`), and dynamic Colab model loader.
- **Computer Vision Diagnostics**: NVIDIA Vision LLM integration (`meta/llama-3.2-11b-vision-instruct`) combined with DuckDuckGo real-time extension retrieval.
- **Third-Party Data Integrations**:
  - OpenWeatherMap & IMD for hyper-local agricultural weather forecasts.
  - Data.gov.in Agmarknet API for real-time mandi commodity price feeds.

---

## API Endpoints Architecture

All endpoints are grouped under `/api/v1` and modularized in `app/api/v1/endpoints/`:

| Route Prefix | Controller | Primary Responsibility |
| :--- | :--- | :--- |
| `/api/v1/system` | `system.py` | Health checks and system status diagnostics. |
| `/api/v1/auth` | `auth.py` | User registration, JWT issuance, phone/email OTP verification. |
| `/api/v1/profile` | `profile.py` | Farmer profiling, soil parameters (NPK, pH), and notification preferences. |
| `/api/v1/agri-flow` | `agri_flow.py` | Crop lifecycle calendar, stage progression, and task management. |
| `/api/v1/chat` | `chat.py` | Multilingual conversational agronomist with RAG context injection. |
| `/api/v1/agent` | `agent.py` | Direct LangGraph agentic reasoning and decision pipelines. |
| `/api/v1/prediction` | `prediction.py`, `growth_stage.py` | Leaf disease photo diagnostics and ML crop growth stage predictions. |
| `/api/v1/market` | `market.py` | Live Agmarknet mandi prices, trends, and storage break-even advisory. |
| `/api/v1/weather` | `weather.py` | Microclimatic risk scoring (fungal, bacterial, insect) and spray windows. |
| `/api/v1/voice` | `voice.py` | Voice transcription routing and text-to-speech services. |
| `/api/v1/recommendation` | `recommendation.py` | Soil suitability matching and fertilizer recommendations. |

---

## Directory Structure

```
backend/
├── app/
│   ├── main.py                    # Application entrypoint, CORS, and lifecycle hooks
│   ├── api/v1/
│   │   ├── router.py              # Central APIRouter consolidating endpoints
│   │   └── endpoints/             # HTTP route controllers
│   ├── core/
│   │   ├── config.py              # Environment settings dataclass
│   │   ├── security.py            # Password hashing and JWT encoding/decoding
│   │   └── logging.py             # Structured JSON and application logging
│   ├── db/
│   │   ├── session.py             # Asyncpg connection pool and query abstractions
│   │   └── init_db.py             # DDL table creation and schema migrations
│   ├── agents/
│   │   ├── langgraph_agent.py     # LangGraph state machine and routing
│   │   └── planner.py             # Farm task generation logic
│   ├── services/
│   │   ├── vision_scan_service.py # NVIDIA Vision LLM + DuckDuckGo pipeline
│   │   ├── agri_flow_planner_service.py # Crop scheduling blueprints
│   │   ├── weather/               # Meteorology and disease risk indexes
│   │   ├── market/                # Mandi price ingestion and storage algorithms
│   │   ├── ml_models/             # Model loaders, preprocessors, and Colab bridge
│   │   └── llm/                   # OpenAI-compatible LLM client and system prompts
│   └── schemas/                   # Pydantic data validation contracts
├── requirements.txt               # Backend Python dependencies
├── Dockerfile                     # Container build manifest
└── README.md                      # Backend documentation
```

---

## Environment Configuration

Configure the required environment parameters in `backend/.env`:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require
DATABASE_NAME=neondb

# Security
SECRET_KEY=your_secure_random_secret_key_32_characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI & LLM Service
OPENAI_API_KEY=your_openai_or_groq_api_key
OPENAI_MODEL=gpt-4.1-nano
OPENAI_BASE_URL=

# Vision Pathology Service
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# Meteorological & Market APIs
OPENWEATHER_API_KEY=your_openweather_api_key
DATA_GOV_API_KEY=your_data_gov_india_key
```

---

## Running the Server

### Local Development
```bash
# Activate virtual environment
source venv/bin/activate

# Start ASGI server with hot reloading
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive documentation is available at:
- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`

### Docker Deployment
```bash
docker build -t agrinexa-backend .
docker run -p 8000:8000 --env-file .env agrinexa-backend
```
