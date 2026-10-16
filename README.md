<<<<<<< HEAD
# Persona AI — multi-provider starter

A React + Vite frontend and FastAPI backend with explicit provider selection and distinct preset personalities.

## Features
- Provider selector (no API-key prefix detection)
- Eight preset personalities plus a custom personality builder
- Provider and persona discovery endpoints
- No API-key validation step: paste a key and begin; the first chat request will reveal any provider/key issue
- Session-only key handling in frontend state; this app does not write keys to localStorage or a database
- Dark responsive UI
- Friendly API errors

## Important compatibility note
This starter uses an OpenAI-compatible chat client for the configured providers. Compatibility varies by provider, model, account, and endpoint. In particular, Anthropic's native API is not generally interchangeable with the OpenAI chat-completions API; use Anthropic's native SDK/adapter before advertising it as fully supported. Validate each provider/model with a real account before production. Some provider model IDs may need updating over time. Groq is configured to use `openai/gpt-oss-120b` because `llama-3.3-70b-versatile` was retired for free/developer-tier usage in August 2026.

The Gemini endpoint configured here uses Google's OpenAI compatibility endpoint. If your Google key uses a newer authorization-key format or requires a different authentication flow, the compatibility endpoint may not accept it; implement and test Google's native `google-genai` SDK path for that key type. This app intentionally does not guess a provider based on the key's characters.

## Run on Windows

### 1. Backend
Open a terminal in the project root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

If PowerShell blocks activation:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --port 8000
```

Backend checks:
- http://localhost:8000/api/health
- http://localhost:8000/api/providers
- http://localhost:8000/api/personas
- http://localhost:8000/docs

### 2. Frontend
Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually http://localhost:5173.

## Configure deployment
Set `FRONTEND_ORIGIN` on the backend to your exact frontend origin. Set `VITE_API_BASE_URL` in `frontend/.env` to the backend URL before building/deploying.

## Security and production checklist
- Do not log request bodies or API keys. Avoid reverse-proxy/APM body capture.
- API keys are not stored in browser storage or a database by this frontend, but are held in React memory and sent to your backend for each API call. They exist in request memory and are sent to the selected provider.
- Add rate limiting, request-size limits, abuse monitoring without secrets, HTTPS, and deployment secrets hygiene.
- The included keyword-based cyber filter is only a lightweight heuristic, not a comprehensive safety system.
- Use provider-native SDK adapters where compatibility or auth flows require them.
- Verify current provider model names, terms, account access, and billing before production.
- Never expose provider keys in URLs, frontend logs, error traces, or source control.
=======
# persona-ai
>>>>>>> 614dce7a78cf5a3c1827129bac2706bae6bde0f7
