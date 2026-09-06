<h1 align="center">ENSET AI</h1>

<p align="center">
  Self-hosted academic RAG platform for private PDF conversations, source citations, and an optional public assistant.
</p>

<p align="center">
  <img alt="CI" src="https://img.shields.io/badge/CI-passing-brightgreen?style=flat-square&logo=githubactions&logoColor=white">
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square">
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img alt="Flask" src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-149ECA?style=for-the-badge&logo=react&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img alt="Postgres" src="https://img.shields.io/badge/Postgres-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img alt="MinIO" src="https://img.shields.io/badge/MinIO-C72E49?style=for-the-badge&logo=minio&logoColor=white">
  <img alt="Qdrant" src="https://img.shields.io/badge/Qdrant-DC244C?style=for-the-badge&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">
</p>

## Overview

ENSET AI is a production-oriented academic AI platform for authenticated document chat. Students and staff can upload PDFs, ask questions against selected documents, stream answers in real time, and inspect source citations.

The platform also includes an optional public landing assistant. That public assistant is limited to administrator-approved public context; authenticated private documents, conversations, users, and provider settings stay behind login.

## Features

- **Private document chat**: upload PDFs after authentication and query selected documents.
- **Source citations**: every document-grounded answer shows the source pages used as context.
- **Streaming responses**: answers stream as they are generated.
- **Conversation history**: sessions and messages are stored per user.
- **Admin controls**: manage users, roles, documents, conversations, announcements, audit logs, and runtime settings.
- **Scalable RAG storage**: Postgres for metadata, MinIO or S3-compatible storage for PDFs, and Qdrant for vectors.
- **Self-hosted deployment**: Docker Compose runs the full stack.

## Screenshots

### Public entry

![Public landing page](docs/screenshots/landing.png)

### Authentication

![Login screen](docs/screenshots/login.png)

### Chat workspace

![Authenticated chat workspace](docs/screenshots/chat-workspace.png)

![Chat response with workspace controls](docs/screenshots/chat-response.png)

### Model selection

![Model selector](docs/screenshots/model-selector.png)

### Administration

![Admin dashboard](docs/screenshots/admin-dashboard.png)

![Admin settings](docs/screenshots/admin-settings.png)

### Storage and retrieval

![MinIO object storage console](docs/screenshots/minio-storage.png)

![RAG storage and embedding flow](docs/screenshots/rag-storage-flow.svg)

### Access control

![Role boundary screen](docs/screenshots/access-boundary.png)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + TailwindCSS |
| Backend API | Python Flask |
| Metadata DB | Postgres in Docker, SQLite for lightweight local development |
| Object Storage | MinIO or any S3-compatible provider |
| Vector DB | Qdrant in Docker, Chroma for lightweight local development |
| Embeddings | `all-MiniLM-L6-v2` (sentence-transformers) |
| LLM | Configurable providers through the backend |
| Deployment | Docker Compose |

---

## Quickstart Docker

```bash
# 1. Copy and fill in your Groq API key
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here

# 2. Start all services
docker-compose up --build

# 3. Open the app
open http://localhost:3000
```

The Docker stack starts Postgres, MinIO, Qdrant, Redis, the backend, and the frontend.

---

## Production Readiness Checks

The current branch has been validated with:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd backend && ./venv/bin/python -m pytest -q
cd backend && ./venv/bin/python -m ruff check .
docker compose config --quiet
```

Latest local results:

- Frontend lint: passed
- Frontend production build: passed
- Backend lint: passed
- Backend tests: `29 passed`
- Docker Compose config: valid
- Postgres, MinIO, Qdrant, and app boot smoke checks: passed

---

## Local Development (no Docker)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker for the optional local vector database, or Docker Compose for the full stack

### Step 1 - Start ChromaDB

```bash
docker run -p 8000:8000 chromadb/chroma:latest
```

### Step 2 - Start the Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # fill in GROQ_API_KEY
python app.py
# running on http://localhost:8080
```

### Step 3 - Start the Frontend

```bash
cd frontend
npm install
npm run dev
# running on http://localhost:3000
```

---

## Environment Variables

Copy `.env.example` to `.env` and set at minimum:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get a free key at [console.groq.com](https://console.groq.com).

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | blank | **Required** |
| `GROQ_MODEL` | `llama3-70b-8192` | Groq model name |
| `LLM_TEMPERATURE` | `0.7` | Response creativity |
| `DATABASE_URL` | blank | Postgres connection URL; leave blank to use local SQLite |
| `CHROMA_HOST` | `localhost` | ChromaDB host (`chromadb` in Docker) |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `VECTOR_STORE_BACKEND` | `chroma` | Vector backend: `chroma` or `qdrant` |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant HTTP endpoint |
| `QDRANT_API_KEY` | blank | Optional Qdrant API key |
| `DOCUMENT_STORAGE_BACKEND` | `local` | PDF storage backend: `local` or `s3` |
| `DOCUMENT_STORAGE_PREFIX` | `documents` | Object key prefix for stored PDFs |
| `S3_BUCKET` | blank | Bucket for PDFs when using S3/MinIO/R2 |
| `S3_ENDPOINT_URL` | blank | S3-compatible endpoint; use `http://minio:9000` for bundled MinIO |
| `S3_REGION` | `us-east-1` | S3 region |
| `S3_ACCESS_KEY_ID` | blank | S3/MinIO access key |
| `S3_SECRET_ACCESS_KEY` | blank | S3/MinIO secret key |
| `CHUNK_SIZE` | `1000` | Max chars per document chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | Chunks retrieved per query |
| `MAX_HISTORY_TURNS` | `6` | Exchange pairs kept in session memory |
| `REDIS_URL` | blank | Shared rate-limit storage |
| `TRUST_PROXY_HEADERS` | `false` | Trust one reverse proxy hop for client IP/proto headers |

---

## Storage Architecture

Docker Compose runs the scalable RAG storage layout:

- Postgres stores users, conversations, document metadata, roles, settings, audit logs, and public assistant events.
- MinIO stores original uploaded PDFs through the S3-compatible backend.
- Qdrant stores document embeddings.
- The backend still keeps a small temporary upload directory for validation and ingestion, but the durable PDF copy is stored in object storage.

During ingestion, ENSET AI extracts text from the uploaded PDF, splits it into chunks, embeds those chunks, and writes the vectors to Qdrant. The original PDF is kept in MinIO or another S3-compatible object store, while Postgres keeps the document ownership, visibility, permissions, and conversation records. ChromaDB remains available as the lightweight local vector fallback.

Local development can still use SQLite, local PDFs, and Chroma by leaving `DATABASE_URL` empty, `DOCUMENT_STORAGE_BACKEND=local`, and `VECTOR_STORE_BACKEND=chroma`.

For managed S3, Cloudflare R2, Backblaze B2, or another S3-compatible service, keep `DOCUMENT_STORAGE_BACKEND=s3` and replace `S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.

Existing deployments need two one-time migrations before switching production traffic:

```bash
cd backend

# 1. Copy SQLite metadata into Postgres
./scripts/migrate_sqlite_to_postgres.py \
  --sqlite-path ./data/enset_ai.db \
  --database-url postgresql://enset_ai:password@postgres:5432/enset_ai

# 2. Copy existing PDFs into S3/MinIO object storage
DOCUMENT_STORAGE_BACKEND=s3 \
S3_BUCKET=enset-ai-documents \
S3_ENDPOINT_URL=http://localhost:9000 \
S3_REGION=us-east-1 \
S3_ACCESS_KEY_ID=ensetai \
S3_SECRET_ACCESS_KEY=ensetai-dev-password \
./scripts/migrate_uploads_to_object_storage.py \
  --sqlite-path ./data/enset_ai.db \
  --uploads-dir ./uploads

# 3. Rebuild vectors into Qdrant from the stored PDFs
DATABASE_URL=postgresql://enset_ai:password@postgres:5432/enset_ai \
DOCUMENT_STORAGE_BACKEND=s3 \
S3_BUCKET=enset-ai-documents \
S3_ENDPOINT_URL=http://localhost:9000 \
S3_REGION=us-east-1 \
S3_ACCESS_KEY_ID=ensetai \
S3_SECRET_ACCESS_KEY=ensetai-dev-password \
QDRANT_URL=http://localhost:6333 \
./scripts/reindex_vectors_from_storage.py --vector-store-backend qdrant
```

Keep the original PDFs and metadata backed up; vector storage is reproducible from those two sources.

---

## Public Landing Assistant

The landing page can show a small public assistant before login. Its role is to help visitors understand the platform from admin-approved public information. It is separate from the authenticated document chat:

- the assistant frontend uses only `/api/public-assistant/config` and `/api/public-assistant/stream`
- it does not receive session IDs, document IDs, private documents, authenticated chat history, user records, tools, or provider credentials
- visitors cannot choose the provider or model
- admins configure enablement, public context, behavior instructions, greeting, suggested questions, provider/model, and hourly rate limit from the admin settings screen
- conversations are kept only in browser state and are reset on refresh
- the server stores metadata-only events: hashed IP, hashed user-agent, outcome, provider/model, latency, input/output character counts, and timestamp

The assistant is instructed to answer only from admin-approved public context and to refuse unsupported questions. This is an LLM behavior constraint, not a mathematically guaranteed grounding boundary. Keep public context concise, factual, and free of private data or instructions that should not be shown to visitors.

Production Compose routes traffic through Nginx and sets `TRUST_PROXY_HEADERS=true` so backend rate limits use the real client IP from the trusted proxy hop. Do not enable that flag when the backend is directly exposed to untrusted clients.

---

## API Reference

```
GET  /api/health
POST /api/sessions                    → { session_id }
POST /api/documents/upload            multipart: files[], session_id
GET  /api/documents
DELETE /api/documents/<doc_id>
POST /api/chat/stream                 JSON: { session_id, message, doc_ids[] }
                                      → text/event-stream (SSE)
DELETE /api/sessions/<session_id>
GET  /api/public-assistant/config     public landing assistant config
POST /api/public-assistant/stream     public landing assistant SSE stream
```

---

## Project Structure

```
ENSET_AI/
├── backend/                  # Python Flask API
│   ├── app.py
│   ├── config.py
│   ├── routes/               # documents.py, chat.py
│   ├── services/             # document, retrieval, chat, session
│   ├── models/               # DocumentRecord, SessionRecord
│   └── Dockerfile
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── api/client.ts
│   │   ├── hooks/            # useSession, useDocuments, useChat
│   │   ├── components/
│   │   └── types/index.ts
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```
