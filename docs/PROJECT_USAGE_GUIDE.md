# Project Usage Guide

## 1. What This Project Is

This project is a certified OpenAI Agents SDK web app template. It includes a real React frontend, an Express API server, an Agents SDK agent, deterministic SDK tools, streaming responses, observability hooks, tests, and validation scripts.

The included demo app is called Launch Desk. It helps an engineering team turn a rough product launch idea into an actionable release plan.

## 2. Who This Project Is For

Use this template if you are:

- A developer building an OpenAI Agents SDK web app.
- A team testing agent workflows with tool calls and streamed output.
- A beginner who wants a working starting point for an AI web app with frontend, backend, tools, tests, and docs already wired together.

## 3. How The System Works

The app follows this flow:

```text
User opens the web UI
  -> enters a launch brief, audience, launch date, constraints, and assets
  -> frontend POSTs the form to /api/agent/launch-plan
  -> Express validates the request with Zod
  -> server runs the OpenAI Agents SDK agent
  -> the agent uses launch-planning tools
  -> the API streams Server-Sent Events back to the browser
  -> the UI updates progress, streamed draft text, final output, and errors
```

The API key is used only on the server. The frontend calls local API routes and should never receive the raw key.

## 4. Main Files and Folders

| Path | Purpose | When to edit it |
| --- | --- | --- |
| `src/main.tsx` | React UI for the Launch Desk app | Change form fields, UI copy, example prompts, or client stream handling |
| `src/styles.css` | App layout and styling | Adjust visual design, spacing, responsive behavior, or component styles |
| `server/app.ts` | Express app setup and API route registration | Add API routes, middleware, health checks, or server-level behavior |
| `server/index.ts` | Local API server entry point | Change host, port startup behavior, or server boot logic |
| `server/routes/agentRoute.ts` | SSE route that validates input, runs the agent, and streams events | Change stream event mapping, error behavior, or request handling |
| `server/agent/launchAgent.ts` | Agents SDK agent configuration and instructions | Change agent name, model, instructions, or prompt construction |
| `server/tools/launchTools.ts` | Deterministic domain logic and SDK tool adapters | Add or modify tools for task extraction, readiness, checklists, or launch copy |
| `server/domain/launchTypes.ts` | Shared schemas and TypeScript types | Change request shape, validation rules, or shared data contracts |
| `server/observability/tracing.ts` | Trace-style lifecycle logging | Adjust logging fields or add observability hooks |
| `tests/` | Vitest tests for tools and API health | Add tests for new tools, routes, validation, or security behavior |
| `scripts/verify-stream.ts` | End-to-end streamed API verifier | Update stream checks when event contracts change |
| `scripts/smoke.ts` | Browser/API smoke test | Update if the UI route, heading, or stream contract changes |
| `scripts/test-ui.ts` | Full browser interaction test | Update when the user flow changes |
| `README.md` | Short setup and verification overview | Keep public setup commands accurate |
| `VALIDATION_CHECKLIST.md` | Release validation checklist | Update when certification gates change |

## 5. How To Run Locally

Install dependencies:

```bash
pnpm install
```

Run the frontend and API server together:

```bash
pnpm dev
```

Run unit tests:

```bash
pnpm test
```

Run the production build:

```bash
pnpm run build
```

When the app is running, open:

```text
http://127.0.0.1:5173
```

## 6. Environment Variables

Required for live agent calls:

```text
OPENAI_API_KEY=your-server-side-openai-api-key
```

Optional:

```text
LAUNCH_DESK_MODEL=gpt-5.4-mini
PORT=8787
```

This repo includes `.env.example`. Copy it to `.env.local`, then set your real key locally:

```bash
cp .env.example .env.local
```

Do not commit `.env.local`. Do not put `OPENAI_API_KEY` in frontend code.

## 7. How To Use The App

1. Start the app with `pnpm dev`.
2. Open `http://127.0.0.1:5173`.
3. Fill in the launch brief, audience, launch date, constraints, and available assets.
4. Optionally click an example prompt to load a realistic starting brief.
5. Click `Generate release plan`.
6. Watch the progress rail as tools complete.
7. Read the streamed draft text and final release plan.

The final answer is designed to include a prioritized plan, risk register, owner checklist, launch copy suggestions, and follow-up questions when important details are missing.

## 8. How To Customize

- App title and UI text: edit `src/main.tsx`.
- Layout and visual style: edit `src/styles.css`.
- Agent instructions: edit `server/agent/launchAgent.ts`.
- Model config: set `LAUNCH_DESK_MODEL` in `.env.local` or change the default in `server/agent/launchAgent.ts`.
- Request schema: edit `server/domain/launchTypes.ts`.
- API behavior and streaming: edit `server/routes/agentRoute.ts`.
- Tool behavior: edit deterministic functions and SDK tool wrappers in `server/tools/launchTools.ts`.
- Tests: add or update files in `tests/`.
- Browser validation: update scripts in `scripts/`.

Keep orchestration in `server/agent`, domain logic in `server/tools` and `server/domain`, API translation in `server/routes`, and UI state in `src`.

## 9. Current Limitations

- Live agent calls require a valid server-side `OPENAI_API_KEY`.
- `pnpm run verify:stream`, `pnpm run smoke`, and `pnpm run test:ui` need local servers and live API access for full end-to-end verification.
- The included agent is specialized for launch planning. To build a different product, update the form, schema, tools, agent instructions, and tests together.
- The template does not include persistence, authentication, deployment config, or production rate limiting.

## 10. Recommended Next Steps

Add a structured final-output schema so downstream apps can render the release plan as typed sections instead of plain streamed text.
