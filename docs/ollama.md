# Ollama (future option, not installed)

[Ollama](https://github.com/ollama/ollama) runs open-weight models on your own machine. We are **not** using it yet; this note records how it could fit if we ever want local models.

## Why we might use it
- No per-token API cost for high-volume, low-stakes text (for example, drafting feed posts).
- Data stays on the machine.
- Works offline for local development.

## What it looks like
- Install: `curl -fsSL https://ollama.com/install.sh | sh` (macOS/Linux), or the Docker image.
- Run a model: `ollama run <model>`. It serves a REST API on `http://localhost:11434` (e.g. `POST /api/chat`).
- From this Node app: the `ollama` npm package (`ollama.chat({ model, messages })`).

## What switching would take
All model calls go through `src/lib/anthropic.ts` and `src/lib/ai.ts`. Moving any of them to Ollama means an adapter for that call, and replacing Anthropic-specific features it relies on: structured outputs (quizzes), server-side refusal fallbacks, and prompt caching.

## Trade-offs to check first
- Local models are usually weaker than Claude at accurate, cited teaching, which is the core of the product. Evaluate on our lesson and quiz prompts before switching anything.
- A deployed app would need a GPU server running Ollama; that is hosting work and cost we don't have today.
