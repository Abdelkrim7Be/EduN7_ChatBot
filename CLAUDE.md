# EduN7 — Project Context

RAG chatbot for ENSET Mohammedia. Users upload PDFs and have multi-turn AI conversations about their content. React + Flask + ChromaDB, rebuilt from scratch in May 2026.

---

## Stack

| Layer       | Technology                                                          | Port            |
|-------------|---------------------------------------------------------------------|-----------------|
| Frontend    | React 18 + Vite + TypeScript + TailwindCSS                          | 3000 / 80       |
| Backend     | Python Flask                                                        | 8080            |
| Vector DB   | ChromaDB (persistent, one collection per document)                  | 8000            |
| Embeddings  | `all-MiniLM-L6-v2` (sentence-transformers, loaded at module level)  | —               |
| LLM         | Gemini / Cerebras / Groq / Anthropic / OpenAI / Ollama              | —               |
| Auth        | JWT (PyJWT) + bcrypt                                                | —               |
| Persistence | SQLite at `backend/uploads/conversations.db`                        | —               |
| Container   | Docker Compose (3 services: chromadb, backend, frontend)            | —               |

Primary providers: **Cerebras** (fastest, free) + **Gemini** (free, 1M context). Both keys in `.env`.

---

## Directory

```
EduN7_ChatBot/
├── backend/
│   ├── app.py                  Flask factory + blueprint registration
│   ├── config.py               All config from env vars
│   ├── database.py             SQLite init + migrations (safe to re-run)
│   ├── limiter_instance.py     Shared flask-limiter (imported by routes)
│   ├── middleware/auth.py      @require_auth, @require_role decorators
│   ├── models/                 DocumentRecord (+category), SessionRecord, UserRecord dataclasses
│   ├── routes/                 auth, documents, chat, conversations, providers, admin
│   ├── services/
│   │   ├── auth_service.py     register, login, JWT sign/decode
│   │   ├── document_service.py PDF ingest → ChromaDB + SQLite registry + detect_category()
│   │   ├── retrieval_service.py Parallel multi-collection vector search
│   │   ├── chat_service.py     RAG prompt + LLM streaming + SSE
│   │   ├── session_service.py  In-memory store + SQLite persistence
│   │   └── llm_factory.py      build_llm() + AUTO_FALLBACK_ORDER
│   └── tests/                  pytest smoke tests (conftest.py + test_health.py)
│
├── frontend/src/
│   ├── App.tsx                 Auth gate → LoginPage or full app; Chat/Admin nav; mobile sidebar
│   ├── api/client.ts           apiFetch (injects JWT, handles 401) + streamChat SSE + admin API
│   ├── hooks/                  useAuth, useSession, useDocuments, useChat, useConversations, useProviders
│   ├── components/
│   │   ├── LoginPage.tsx       Split layout — dark navy panel + white card, French labels
│   │   ├── ConversationSidebar.tsx  Recency groups + search + docs grouped by category
│   │   ├── ChatWindow.tsx      White bg, French suggestion pills
│   │   ├── MessageBubble.tsx   User=blue, AI=light surface; copy button + thumbs on hover
│   │   ├── CitationCard.tsx    Source citations below AI messages
│   │   ├── MessageInput.tsx    Send + attach buttons
│   │   ├── ModelSelector.tsx   Provider/model dropdown
│   │   ├── UploadOverlay.tsx   Drag-and-drop with simulated progress stages
│   │   ├── AdminPage.tsx       Stats cards + user table with inline role promotion
│   │   ├── ToastProvider.tsx   Global toast system (success/error/info, 4s auto-dismiss)
│   │   └── StreamingIndicator.tsx  Typing dots during AI response
│   └── types/index.ts          Shared TS types (incl. AdminUser, AdminStats)
│
├── docker-compose.yml          Dev stack
├── docker-compose.prod.yml     Prod overrides (restart, mem limits)
├── nginx-prod.conf             HTTPS + security headers + rate limiting
├── deploy.sh                   One-command VPS deploy (Ubuntu)
└── terminal/                   Standalone Groq CLI chatbot (untouched)
```

---

## Roles & Dev Accounts

| Role        | How assigned                     | Permissions                                          |
|-------------|----------------------------------|------------------------------------------------------|
| `student`   | Default on registration          | Own docs + conversations, chat                       |
| `professor` | Admin promotes via API           | + upload shared docs, view admin stats               |
| `admin`     | Email in `ADMIN_EMAILS` env var  | + list/promote all users, admin panel                |

| Role      | Email              | Password       |
|-----------|--------------------|----------------|
| admin     | admin@enset.ma     | Admin1234!     |
| professor | prof@enset.ma      | Prof1234!      |
| student   | student@enset.ma   | Student1234!   |

Document scope: `private` (uploader only) or `shared` (visible to all, professors/admins only).

---

## How to Run

```bash
# Local dev
docker run -p 8000:8000 chromadb/chroma:latest
cd backend && source .venv/bin/activate && python app.py   # → :8080
cd frontend && npm run dev                                  # → :3000

# Full Docker stack
cp .env.example .env   # fill in LLM key + JWT_SECRET + ADMIN_EMAILS
docker-compose up --build

# Production
sudo bash deploy.sh    # prompts for domain + keys, issues SSL
```

---

## Architecture — Critical Decisions

**Python imports:** Always run backend from `backend/` directory. Use direct imports only.
```python
import config                               # ✓
from models.document import DocumentRecord  # ✓
from backend import config                  # ✗ breaks in Docker
```

**ChromaDB:** One collection per document (`doc_{doc_id}`). Access control enforced in Python via SQL — ChromaDB has no user auth.

**SSE streaming:** Frontend uses `fetch()` + `ReadableStream` (not `EventSource` — that's GET-only). Chat needs a POST body. See `api/client.ts:streamChat()`.

**nginx `proxy_buffering off`:** Non-negotiable. Without it nginx buffers the entire SSE response. Set in both `nginx.conf` and `nginx-prod.conf`.

**nginx dynamic upstream:** Uses `resolver 127.0.0.11 valid=30s; set $backend_host backend;` — required because nginx resolves upstream hostnames at startup and Docker DNS may not be ready. Without the variable trick, nginx fails to start if the backend container isn't up yet.

**Docker networking:** `CHROMA_HOST=chromadb` inside Docker (not `localhost`). The compose file sets this automatically — never hardcode.

**HF_HUB_OFFLINE=1:** Set in docker-compose backend environment. Prevents HuggingFace from reaching out to huggingface.co on startup (which fails in isolated Docker networks and crashes the backend). The embedding model must be pre-baked into the image.

**ChromaDB healthcheck:** Uses `bash -c "timeout 5 bash -c '</dev/tcp/localhost/8000'"` — the chromadb image has no curl/wget/python3, so TCP check is the only option.

**RAG context:** Only the current user message gets document chunks injected. Prior history is plain `HumanMessage`/`AIMessage`. Keeps token usage bounded across long conversations.

**Embedding model:** `HuggingFaceEmbeddings("all-MiniLM-L6-v2")` is a module-level singleton in `document_service.py` and `retrieval_service.py`. ~90MB, ~3s load. Never move it inside a function.

**Document categories:** `detect_category(filename)` in `document_service.py` uses regex on the normalized filename to assign one of: `Cours` · `TD / TP` · `Examens` · `Projets` · `Corrections` · `Autres`. Stored in `documents.category` (SQLite migration runs safely on existing DBs).

**useSession race condition (fixed):** `useSession` now takes `isAuthenticated: boolean` and guards `createSession()` — it previously ran on mount before login, firing `auth:expired` and leaving `sessionId` empty, silently breaking uploads.

**Rate limiter:** Single `Limiter` in `limiter_instance.py`, initialized in `app.py`, imported by routes. In-memory (dev only) — needs Redis for multi-worker production.

**JWT:** Stored in `localStorage["edun7_token"]`. `apiFetch()` injects it on every call and fires `auth:expired` on 401.

**Toast system:** `ToastProvider` wraps the whole app in `App.tsx`. Use `useToast()` anywhere to dispatch toasts. Types: `success` / `error` / `info`.

---

## Git Workflow

### Branches

```
main        ← production releases only (never commit directly)
develop     ← integration branch (merge feature branches here)
feat/<name> ← feature work (branch from develop)
fix/<name>  ← bug fixes (branch from develop for multi-file fixes; commit directly to develop for single-file)
```

### When to commit

Commit after a meaningful unit of work — something that works end-to-end:
- A component renders and works correctly
- An API endpoint is implemented and manually tested
- A pipeline step works end-to-end
- A bug is fixed and verified

Not after every file edit. Wait until something actually works.

### When to create a new branch

Ask: "Is this a standalone system that will take multiple sessions to build?"

**YES → create `feat/<name>` from `develop`** — examples:
- Building the entire professor upload system
- Building the full analytics dashboard
- Full UI redesign

**NO → commit directly to `develop`** — examples:
- Adding a button or fixing a bug
- Tweaking a prompt
- Adding one API endpoint

### Branch rules

- **Never commit directly to `main`**
- Always branch from `develop`, never from `main`
- Naming: `feat/<name>` · `fix/<name>` · `refactor/<scope>`
- When a feature branch is done → PR into `develop` → delete the branch

### Commit format (conventional commits, strict)

```
<type>(<scope>): <short description>
```

Types: `feat` · `fix` · `refactor` · `style` · `docs` · `chore`

Good:
```
feat(auth): add role-based route protection middleware
feat(rag): implement multi-tenant knowledge base switching
fix(chat): resolve streaming timeout on long responses
style(sidebar): add collapse animation with framer motion
chore(ci): add GitHub Actions linting workflow
```

Bad: `"update stuff"` · `"fix"` · `"changes"` · `"wip"`

### Procedure before every commit

1. `git branch` — confirm you're on the right branch
2. `git status` — see what changed
3. `git diff --staged` — review staged content
4. Stage specific files only — never `git add -A` or `git add .`
5. Never stage: `.env`, `node_modules/`, `__pycache__/`, `*.pyc`, `venv/`, `.venv/`, uploaded PDFs
6. `git commit -m "<message>"`
7. Report: branch name, short hash, what was done, what comes next

**No `Co-Authored-By` lines. Ever.**

### After finishing a feature branch

- Summarize what was built
- Remind to merge: `git checkout develop && git merge feat/<name> --no-ff`
- Remind to delete: `git branch -d feat/<name>`
- Remind to push when ready

---

## Status

**Done:**
- JWT auth + bcrypt, 3 roles (student / professor / admin), ADMIN_EMAILS bootstrap
- Per-user data isolation, shared document scope for professors
- PDF ingest → chunk → embed → ChromaDB (per-doc collection)
- RAG pipeline with multi-provider LLM + auto-fallback
- Real-time SSE streaming with inline citation superscripts `[1][2]`
- Conversation history (SQLite), multi-conversation sidebar with recency groups
- XSS protection via `rehype-sanitize` on Markdown render
- Smoke tests (pytest), GitHub Actions CI (lint + tsc + build)
- Docker Compose, deploy.sh, nginx HTTPS config
- **ENSET AI rebrand** — navy `#1E3A5F` / blue `#0077B6` / gold `#F4A800` palette; all components restyled; split login page; French labels throughout
- **Docker/nginx infrastructure fixes** — chromadb TCP healthcheck, nginx dynamic upstream resolver, HF_HUB_OFFLINE env
- **Auth race condition fix** — useSession guards createSession until authenticated
- **Document auto-categorization** — detect_category() by filename regex; sidebar groups by Cours/TD·TP/Examens/Projets/Corrections/Autres with colored icons; select-all per category; cited-doc pulse indicator; Partagé badge on shared docs
- **Admin panel UI (v1)** — stats cards + user table with inline role promotion (student/professor/admin)
- **Toast notification system** — ToastProvider + useToast(); success/error/info with slide-in animation
- **Conversation search** — real-time filter in sidebar
- **Mobile sidebar** — hamburger in header on small screens, overlay drawer with backdrop
- **Message actions** — copy-to-clipboard + thumbs up/down on AI message hover

**Not yet built — GUI:**
- Conversation history reload on session switch (messages disappear when switching — `fetchConversationMessages` exists but isn't wired to useChat on session change)
- Shared document upload UI for professors (scope toggle on upload overlay — backend supports it, no UI)
- Admin panel v2: full layout with left nav, Documents table, Conversations moderation view, Settings panel, Audit log
- Real upload progress (current stages are simulated with timeouts — needs async backend pipeline + polling)
- Professor library view (published docs separate from personal workspace)
- Document preview (show extracted text per page before/after upload)
- react-router-dom routing (currently state-based navigation — needed for proper /admin/* URL routing)

**Not yet built — Backend/Infra:**
- Async ingest pipeline (background worker + status field + polling endpoint)
- Tag-based multi-tenant knowledge bases (replace scope enum with JSON tags array)
- Visitor / anonymous role (short-lived JWT, no user row, rate-limited to public KB)
- Analytics (events table, cost tracking per provider, unanswered detection)
- Redis-backed rate limiter (required for multi-worker production)
- Hybrid search (BM25 + vector + reranking)
- DOCX / PPTX / URL ingestion (PDF only)
- Account lockout (5 failed logins → 15 min block)
- Audit log table + admin viewer
- Settings table (runtime config without redeploy)
- GDPR endpoints (data export + erasure)
- Multilingual embedding model switch (all-MiniLM-L6-v2 is English-only; ENSET needs FR/AR)

---

## Quick Commands

```bash
# TypeScript check
cd frontend && npx tsc --noEmit

# Run tests
cd backend && source .venv/bin/activate && pytest tests/ -v

# Get admin token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@enset.ma","password":"Admin1234!"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

# Promote user to professor
curl -X PUT http://localhost:8080/api/admin/users/<user_id>/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"professor"}'

# Add a new LLM provider
# 1. backend/services/llm_factory.py  → PROVIDER_CATALOG + build_llm()
# 2. backend/config.py                → API key var
# 3. backend/requirements.txt         → langchain package
# 4. .env.example                     → document the key
# 5. frontend/src/components/ModelSelector.tsx → icon (optional)
```
