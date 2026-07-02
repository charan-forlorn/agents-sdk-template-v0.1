# Launch Desk

Launch Desk is a certified OpenAI Agents SDK web app template. It combines a React/Vite frontend, an Express API server, an Agents SDK agent, deterministic tools, streaming responses, tests, and validation scripts.

The included demo helps an engineering team turn a rough product launch idea into an actionable release plan. You can use it as-is to test agent workflows, or use the structure as a starting point for your own AI web app.

## What It Does

- Collects a product brief, audience, launch date, constraints, and available assets.
- Streams agent progress through `/api/agent/launch-plan`.
- Uses deterministic launch-planning tools for task extraction, readiness scoring, owner checklists, and channel copy.
- Produces a prioritized plan, risk register, owner checklist, launch copy suggestions, and follow-up questions.
- Emits trace-style JSON logs for request lifecycle and tool progress.

## How It Works

```text
Browser UI
  -> POST /api/agent/launch-plan
  -> Express validates the launch brief
  -> Agents SDK runs the Launch Desk agent
  -> SDK tools produce structured planning context
  -> API streams tool_progress, model_delta, and final events
  -> UI renders progress and the release plan
```

The OpenAI API key is used by the server process only. The browser calls local API routes and should never receive the raw key.

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
- `scripts/smoke.ts` - browser/API smoke check.
- `scripts/test-ui.ts` - full browser interaction check.
- `docs/PROJECT_USAGE_GUIDE.md` - beginner-friendly guide to running and extending the template.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create local environment:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Set `OPENAI_API_KEY` in `.env.local`. Do not commit `.env.local`.

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

Run the production build:

```bash
pnpm run build
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

## Security Notes

- Never commit `.env.local` or any real API key.
- Keep `OPENAI_API_KEY` server-side only.
- Do not log or print secret values.
- The `/api/health` route reports whether a key is configured, but does not return the key value.
- Browser tests check that the configured key value is not exposed in the DOM.

## Extending Tools

Add deterministic domain logic in `server/tools/`, wrap it with `tool(...)`, then include it in `launchPlanningTools`. Keep orchestration in `server/agent/`, API translation in `server/routes/`, and persistence or external integrations in separate adapters.

Common extension points:

- Change UI copy or example prompts in `src/main.tsx`.
- Change styling in `src/styles.css`.
- Change agent instructions in `server/agent/launchAgent.ts`.
- Add request fields or validation in `server/domain/launchTypes.ts`.
- Add or update tools in `server/tools/launchTools.ts`.
- Add tests in `tests/` before changing behavior.

## Release Safety

`agents-sdk-template-v0.1` is the certified release tag for the original v0.1 baseline. Do not move, recreate, or force-update certified tags. Post-release improvements can continue on `main` without changing the certified release tag.

## Notes

This project uses the current OpenAI Agents SDK rather than the deprecated Assistants API or legacy Chat Completions scaffolding. The server-side agent uses SDK tools, streaming, and trace-friendly lifecycle hooks.
