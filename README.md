# EduN7

EduN7 is a self-hosted RAG chatbot platform for private PDF conversations and an optional public landing assistant. It is built with React, Flask, ChromaDB, Redis, and Docker Compose.

## Features

- **Multi-document support** — Upload multiple PDFs and query across all of them simultaneously
- **Streaming responses** — Words appear in real time as the AI generates the answer
- **Source citations** — Every response shows which document pages were used as context
- **Conversation memory** — The assistant remembers previous turns within your session
- **Public landing assistant** — Optional unauthenticated assistant limited to admin-approved public context
- **Dark, modern UI** — Clean React interface with TailwindCSS

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + TailwindCSS |
| Backend API | Python Flask |
| Vector DB | ChromaDB (persistent) |
| Embeddings | `all-MiniLM-L6-v2` (sentence-transformers) |
| LLM | Configurable providers through the backend |
| Deployment | Docker Compose |

---

## Quickstart — Docker (recommended)

```bash
# 1. Copy and fill in your Groq API key
cp .env.example .env
# Edit .env and set GROQ_API_KEY=your_key_here

# 2. Start all services
docker-compose up --build

# 3. Open the app
open http://localhost:3000
```

The stack starts in the correct order: ChromaDB → Backend → Frontend.

---

## Local Development (no Docker)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker (for ChromaDB only)

### Step 1 — Start ChromaDB

```bash
docker run -p 8000:8000 chromadb/chroma:latest
```

### Step 2 — Start the Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # fill in GROQ_API_KEY
python app.py
# → running on http://localhost:8080
```

### Step 3 — Start the Frontend

```bash
cd frontend
npm install
npm run dev
# → running on http://localhost:3000
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
| `GROQ_API_KEY` | — | **Required** |
| `GROQ_MODEL` | `llama3-70b-8192` | Groq model name |
| `LLM_TEMPERATURE` | `0.7` | Response creativity |
| `CHROMA_HOST` | `localhost` | ChromaDB host (`chromadb` in Docker) |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `CHUNK_SIZE` | `1000` | Max chars per document chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `TOP_K_RESULTS` | `5` | Chunks retrieved per query |
| `MAX_HISTORY_TURNS` | `6` | Exchange pairs kept in session memory |
| `REDIS_URL` | — | Shared rate-limit storage |
| `TRUST_PROXY_HEADERS` | `false` | Trust one reverse proxy hop for client IP/proto headers |

---

## Public Landing Assistant

The landing page can show a small public assistant before login. It is separate from the authenticated document chat:

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
EduN7_ChatBot/
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
