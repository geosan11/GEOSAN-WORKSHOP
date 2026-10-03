# Agent Operational Harness — GEOSAN-WORKSHOP (AetherOrch)

## Operational Principles
1. **Deterministic Verification**: All verification, linting, format-checking, and regression testing are conducted via `scripts/deterministic.sh` without calling external LLM models.
2. **Demo-First Zero-Credential Boot**: The application boots in demo mode with no Supabase URL and no Gemini API key required.
3. **Telemetry & Upstream Pulls**:
   - Enforce strictly one upstream status pull per hour (3,600,000ms TTL).
   - In-memory process counter `upstream_pulls_this_process` tracked inside `server/telemetry-gateway.ts`.
   - `GET /status?force=1` does NOT start a new pull inside the hour.
   - Fan-out on SSE `/status/stream` and WebSocket `/telemetry`.
4. **Shared Weekly Ledger**:
   - Enforce default 400 calls and $3.00 USD total budget cap.
   - 60/30/10 Tier allocation: Tier 1 (240 calls / $1.80), Tier 2 (120 calls / $0.90), Tier 3 (40 calls / $0.30).
   - `POST /budget/admit` refuses admission once tier quota is exhausted.
5. **No Transcripts**: Memory logs and Architectural Decision Records reside strictly in `docs/MEMORY.md`. Do not append conversation transcripts.
