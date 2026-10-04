# AgriNexa

AgriNexa is an enterprise-grade, full-stack agricultural decision-support platform engineered to empower smallholder and commercial farmers. Integrating agentic AI orchestration, edge and cloud machine learning models, computer vision disease diagnostics, real-time hyper-local weather intelligence, and live Agmarknet mandi market price feeds, AgriNexa delivers actionable agronomic guidance, adaptive crop schedules, risk mitigation alerts, and financial storage advisories.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Core Engines and Algorithmic Frameworks](#core-engines-and-algorithmic-frameworks)
  - [1. Agentic Cognitive Orchestration and Multilingual Chat](#1-agentic-cognitive-orchestration-and-multilingual-chat)
  - [2. Vision-Based Crop Disease Diagnostics](#2-vision-based-crop-disease-diagnostics)
  - [3. Machine Learning Crop Growth Stage Engine](#3-machine-learning-crop-growth-stage-engine)
  - [4. AgriFlow Dynamic Scheduling and Stage-Gate Management](#4-agriflow-dynamic-scheduling-and-stage-gate-management)
  - [5. Microclimatic Pest, Disease, and Spray Feasibility Models](#5-microclimatic-pest-disease-and-spray-feasibility-models)
  - [6. Mandi Market Intelligence and Storage Financial Advisory](#6-mandi-market-intelligence-and-storage-financial-advisory)
- [Database Schema and Persistence](#database-schema-and-persistence)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Unified Quickstart](#unified-quickstart)
  - [Manual Backend Configuration](#manual-backend-configuration)
  - [Manual Frontend Configuration](#manual-frontend-configuration)
- [Additional Documentation](#additional-documentation)

---

## System Architecture

AgriNexa utilizes a decoupled, micro-service architecture consisting of a high-throughput FastAPI backend integrated with Neon Serverless PostgreSQL and an Expo/React Native universal client.

```mermaid
graph TD
    subgraph Client ["Mobile Client (React Native / Expo SDK 57)"]
        UI["Mobile Dashboard & Tools"]
        Audio["Voice Service (expo-audio)"]
        Camera["Leaf Scanner (expo-camera)"]
        UI --> APIClient["API Client / Axios"]
        Audio --> APIClient
        Camera --> APIClient
    end

    subgraph Gateway ["API Layer (FastAPI)"]
        APIClient --> Router["APIRouter (/api/v1)"]
        Router --> Auth["Authentication & JWT Session"]
        Router --> Endpoints["Specialized Service Endpoints"]
    end

    subgraph Intelligence ["AI & Machine Learning Layer"]
        Endpoints --> LangGraph["LangGraph / LangChain Agentic Flow"]
        Endpoints --> VisionScan["Vision Diagnostics (NVIDIA Llama-3.2-Vision)"]
        Endpoints --> GrowthModels["Growth Stage Models (RandomForest / PyTorch)"]
        Endpoints --> RAG["RAG Document Retriever"]
        VisionScan --> WebSearch["DuckDuckGo Verification"]
    end

    subgraph DataServices ["Domain & Third-Party Services"]
        Endpoints --> FlowEngine["AgriFlow Planner Service"]
        Endpoints --> WeatherService["Weather Service (OpenWeather / IMD)"]
        Endpoints --> MarketService["Market Service (Data.gov.in Agmarknet API)"]
    end

    subgraph Storage ["Persistence Layer"]
        Auth --> NeonDB[("Neon PostgreSQL via asyncpg")]
        FlowEngine --> NeonDB
        LangGraph --> NeonDB
    end
```

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+) with asynchronous I/O and Uvicorn ASGI server.
- **Database**: Neon Serverless PostgreSQL managed via asynchronous connection pooling (`asyncpg`).
- **AI Agent Orchestration**: LangGraph and LangChain for multi-step agentic execution, fallback intent routing, and conversational memory.
- **Large Language Models**: OpenAI-compatible API interface with adaptive input token budgeting, context compression, and short-mode token truncation.
- **Computer Vision**: Multi-modal vision pipelines leveraging NVIDIA Vision API (`meta/llama-3.2-11b-vision-instruct`) combined with real-time web search verification (`duckduckgo-search`).
- **Machine Learning**: Scikit-Learn (Random Forest classifiers), PyTorch (`GrowthStageNet`), Pandas, and NumPy for growth stage and milestone classification.
- **Audio and Voice**: Fast transcription routing and text-to-speech fallback pipelines.

### Frontend
- **Framework**: React Native 0.86 and Expo SDK 57 with Expo Router (file-based navigation).
- **Styling**: NativeWind (Tailwind CSS v3) paired with React Native Reusables (`@rn-primitives`) following modern UI design specifications.
- **State and Cache**: React Context, Async Storage, and custom network hooks.
- **Internationalization**: `i18next` and `react-i18next` supporting multiple local agricultural languages.
- **Hardware Integration**: `expo-camera`, `expo-image-picker`, `expo-location`, `expo-audio`, and `expo-notifications`.

---

## Core Engines and Algorithmic Frameworks

### 1. Agentic Cognitive Orchestration and Multilingual Chat
The conversational assistant operates through a deterministic-first fallback hierarchy:
- **LangGraph State Graph (`AgriAgentState`)**: Directs farmer queries across localized intent classifiers: `weather`, `market`, `soil`, `pest`, `irrigation`, and `crop`.
- **Context Injection**: Dynamically injects soil profiles (NPK, pH), regional coordinates, current crop stage, and historical conversation turns.
- **Deterministic Heuristic Routing**: If external LLM providers become unreachable, the internal fallback router generates deterministic advisory outputs from verified knowledge databases.

### 2. Vision-Based Crop Disease Diagnostics
The leaf scanner processes farmer image submissions via an end-to-end diagnostic pipeline:
- **Stage 1 (Vision Inference)**: Analyzes visual symptoms using NVIDIA Vision LLM (`meta/llama-3.2-11b-vision-instruct`) to detect lesions, chlorosis, blights, and pest infestations.
- **Stage 2 (Real-Time Search Validation)**: Queries DuckDuckGo Web Search with specific crop-pathogen combinations to fetch recent agricultural extension advisories.
- **Stage 3 (Structured Remediation)**: Synthesizes findings into organic treatments, chemical controls, and preventative field practices formatted in strict JSON schemas.

### 3. Machine Learning Crop Growth Stage Engine
Housed under `models/` and managed by `GrowthStageModelLoader`:
- **Multiclass Stage Classifier (`stage_model.pkl`)**: Random Forest model trained on soil nutrients ($N, P, K$), temperature, humidity, pH, and crop identifier to predict physiological phases (`Seedling`, `Vegetative`, `Flowering`, `Maturity`).
- **Growth Milestone Classifier (`improved_growth_stage_model.pkl`)**: Binary classifier evaluating sunlight hours, irrigation frequency, fertilizer categories, and microclimate parameters.
- **Deep Neural Network (`growth_stage_modelfinal.pt`)**: PyTorch-based neural network architecture (`GrowthStageNet`) equipped with preprocessing standardizers.
- **Colab Extensibility**: Dynamic loader support for custom model weights via `backend/app/services/ml_models/colab_imports/`.

### 4. AgriFlow Dynamic Scheduling and Stage-Gate Management
The AgriFlow planning engine converts static crop blueprints into adaptive calendars:
- **Blueprint Mapping**: Comprehensive agricultural lifecycles mapped for crops including Rice, Wheat, Maize, Cotton, and Pulses.
- **Real-Time Stage Shifting**: Farmer-logged observations (such as early panicle emergence or delayed germination) trigger automated phase shifts, task re-indexing, and recalculation of total cycle completion.
- **Task Verification**: Daily monitoring logs validate field activities against weather windows (preventing fertilizer application before heavy rain).

### 5. Microclimatic Pest, Disease, and Spray Feasibility Models
Real-time meteorology data translates into operational field thresholds:
- **Fungal Pathogen Index**:
  $$\text{Score}_{\text{fungal}} = (15^{\circ}\text{C} \le T \le 25^{\circ}\text{C} \to 40) + (\text{Humidity} > 80\% \to 30) + (\text{Rainfall} > 10\text{mm} \to 30)$$
- **Bacterial Pathogen Index**:
  $$\text{Score}_{\text{bacterial}} = (\text{Humidity} > 75\% \to 50) + (\text{Rainfall} > 5\text{mm} \to 50)$$
- **Chemical Spray Feasibility Check**:
  - Prohibited: Precipitation $> 2\text{mm}$ (wash-off hazard) or Wind Speed $> 25\text{ km/h}$ (drift risk).
  - Optimal: Wind Speed between $5\text{ km/h}$ and $15\text{ km/h}$ with clear sky forecasts.

### 6. Mandi Market Intelligence and Storage Financial Advisory
- **Agmarknet Price Extraction**: Connects to the official Data.gov.in API with an automated 4-tier relaxation strategy (District Mandi $\to$ Regional Center $\to$ State Average $\to$ National Trend).
- **Warehouse Storage Break-Even Analysis**:
  Evaluates commodity holding profitability against warehouse fees and projected appreciation:
  $$\text{Breakeven Monthly Growth (\%)} = \left(\frac{\text{Storage Cost per Unit}}{\text{Current Market Price}}\right) \times 100$$
  Yields automated Sell versus Hold recommendations based on commodity price volatility trends.

---

## Database Schema and Persistence

Primary data operations are managed within Neon PostgreSQL via asynchronous connection pooling (`asyncpg`). The relational schema comprises:

- `users`: User profiles, credentials, onboarding status, district/state locations, soil parameters ($N, P, K, \text{pH}$), push notification tokens, and monitoring logs.
- `otps`: Ephemeral authentication and verification records.
- `chat_conversations`: Conversation sessions, metadata, archive flags, and recent message snippets.
- `chat_messages`: Message history, role definitions, source mode (voice/text), and user feedback ratings.
- `agri_flow_plans`: Structured crop calendar documents, active task nodes, and stage progress.
- `agri_flow_updates`: Audit trail of farmer-initiated stage shifts and schedule overrides.
- `agri_flow_stage_tests`: Experimental records for model stage predictions.
- `agri_flow_task_logs`: Historical task completion verification records.
- `farming_plans`: Custom farm management blueprints and long-term farm data.

---

## Repository Structure

```
AgriNexa/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/      # REST API route controllers
│   │   │   ├── agent.py           # Agent interaction endpoints
│   │   │   ├── agri_flow.py       # Crop calendar and task management
│   │   │   ├── auth.py            # JWT authentication and user registration
│   │   │   ├── chat.py            # Conversational agronomist endpoints
│   │   │   ├── growth_stage.py    # ML stage prediction controller
│   │   │   ├── market.py          # Agmarknet mandi price endpoints
│   │   │   ├── prediction.py      # Plant diagnostics and image endpoints
│   │   │   ├── profile.py         # Farmer profile and soil data
│   │   │   ├── rag.py             # Knowledge retrieval endpoints
│   │   │   ├── recommendation.py  # Crop and input recommendation engine
│   │   │   ├── voice.py           # Voice input and audio handling
│   │   │   └── weather.py         # Weather diagnostics and forecast
│   │   ├── core/                  # Application configuration, security, and logging
│   │   ├── db/                    # Neon PostgreSQL connection pool and DDL schema
│   │   ├── agents/                # LangGraph state machines and multi-agent logic
│   │   ├── services/              # Core business services (vision, weather, market, ML)
│   │   └── schemas/               # Pydantic validation schemas
│   ├── Dockerfile                 # Container specification
│   ├── requirements.txt           # Python backend dependencies
│   └── README.md                  # Backend specific documentation
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/                # Authentication screens (login, onboarding)
│   │   ├── (private)/             # Protected application routes
│   │   │   ├── (tabs)/            # Main tab navigation (home, agriflow, prices, profile)
│   │   │   └── (non-tabs)/        # Leaf scanner, assistant, reports, ML test lab
│   │   └── _layout.tsx            # Root navigation structure
│   ├── components/                # React Native Reusables UI components
│   ├── services/                  # Backend HTTP clients and data mappers
│   ├── context/                   # React context providers
│   ├── package.json               # Mobile application dependencies
│   └── README.md                  # Frontend development documentation
│
├── models/                        # Pre-trained ML models and stage artifacts
│   ├── stage_model.pkl            # Random Forest multi-class stage model
│   ├── improved_growth_stage_model.pkl
│   └── growth_stage_modelfinal.pt # PyTorch GrowthStageNet deep learning model
│
├── .github/workflows/             # Continuous integration and APK build pipelines
│   └── release-apk.yml            # Android release build workflow
├── run.sh                         # Unified startup script for backend and frontend
├── AGENTS.md                      # UI and component styling guidelines
└── README.md                      # Primary project documentation
```

---

## Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18.x or higher and npm
- Neon PostgreSQL database instance (or standard PostgreSQL instance)

---

### Unified Quickstart

The repository provides a unified runner script that boots both the FastAPI backend and Expo frontend concurrently with automated signal handling:

```bash
chmod +x run.sh
./run.sh
```

---

### Manual Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source ./venv/bin/activate
   pip install -r requirements.txt
   ```
3. Create `.env` based on `.env.example`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require
   SECRET_KEY=your_secure_secret_key
   OPENAI_API_KEY=your_openai_or_groq_key
   OPENAI_MODEL=gpt-4.1-nano
   NVIDIA_API_KEY=your_nvidia_vision_key
   OPENWEATHER_API_KEY=your_openweather_key
   DATA_GOV_API_KEY=your_data_gov_india_key
   ```
4. Start the ASGI development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. Interactive OpenAPI documentation is accessible at `http://localhost:8000/api/v1/docs`.

---

### Manual Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variable in `.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Start the Expo development server:
   ```bash
   npx expo start
   ```
5. Choose your target platform:
   - Press `a` for Android emulator or connected device.
   - Press `i` for iOS simulator.
   - Press `w` for Web preview.
   - Scan the terminal QR code using Expo Go.

---

## Additional Documentation

Detailed documentation for individual subsystems is available at:

- [Agent UI and Styling Guidelines (AGENTS.md)](./AGENTS.md)
- [Backend Subsystem Documentation](./backend/README.md)
- [Frontend Mobile Client Documentation](./frontend/README.md)
- [Machine Learning Colab Imports Specification](./backend/app/services/ml_models/colab_imports/README.md)
