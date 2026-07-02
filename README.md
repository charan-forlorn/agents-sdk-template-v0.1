# Launch Desk

Launch Desk is a frontend plus OpenAI Agents SDK app that turns a rough product launch idea into an actionable release plan.

## What It Does

- Collects a product brief, audience, launch date, constraints, and available assets.
- Streams agent progress through `/api/agent/launch-plan`.
- Uses deterministic launch-planning tools for task extraction, readiness scoring, owner checklists, and channel copy.
- Produces a prioritized plan, risk register, owner checklist, launch copy suggestions, and follow-up questions.
- Emits trace-style JSON logs for request lifecycle and tool progress.

## Project Structure

- `src/` - React/Vite frontend UI.
- `server/index.ts` - Express API server.
- `server/routes/` - API route handlers and SSE stream conversion.
- `server/agent/` - OpenAI Agents SDK agent setup and instructions.
- `server/tools/` - Tool implementations and SDK tool adapters.
- `server/domain/` - Shared launch-planning types and validation.
- `server/observability/` - trace logging hooks.
- `tests/` - focused deterministic tool tests.
- `scripts/verify-stream.ts` - end-to-end streamed API verifier.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create local environment:

   ```bash
   Copy `.env.example` to `.env.local`.
   ```

3. Set `OPENAI_API_KEY` in `.env.local`.

   `LAUNCH_DESK_MODEL` defaults to `gpt-5.4-mini`. The model can be changed in `.env.local`. Current OpenAI model guidance is at [developers.openai.com/api/docs/models](https://developers.openai.com/api/docs/models).

4. Run the app:

   ```bash
   pnpm run dev
   ```

5. Open the frontend:

   ```text
   http://127.0.0.1:5173
   ```

## Verification

Run focused deterministic tests:

```bash
pnpm test
```

With the API server running and `OPENAI_API_KEY` configured, verify the real streamed agent endpoint:

```bash
pnpm run verify:stream
```

The verifier posts a realistic launch brief to `http://127.0.0.1:8787/api/agent/launch-plan` and fails unless it receives at least one `tool_progress` event and one `model_delta` event.

Run the browser/API smoke check:

```bash
pnpm run smoke
```

The smoke check loads the frontend with Playwright Chromium, writes a screenshot to `artifacts/launch-desk-smoke.png`, checks `/api/health`, and verifies `tool_progress`, `model_delta`, and `final` stream events.

Run the full browser interaction check:

```bash
pnpm run test:ui
```

The UI check opens the app, submits a launch brief, verifies progress rail updates, verifies streaming and final output, checks that `OPENAI_API_KEY` is not exposed in the DOM, and captures `artifacts/launch-desk-ui-flow.png`.

## Extending Tools

Add deterministic domain logic in `server/tools/`, wrap it with `tool(...)`, then include it in `launchPlanningTools`. Keep orchestration in `server/agent/`, API translation in `server/routes/`, and persistence or external integrations in separate adapters.

## Notes

This project uses the current OpenAI Agents SDK rather than the deprecated Assistants API or legacy Chat Completions scaffolding. The server-side agent uses SDK tools, streaming, and trace-friendly lifecycle hooks.
