# Launch Desk Validation Checklist

## Agent Behavior

- [ ] Calls `extract_tasks_from_brief` before final response.
- [ ] Calls `check_launch_readiness` before final response.
- [ ] Calls `generate_owner_checklists` before final response.
- [ ] Calls `draft_channel_launch_copy` before final response.
- [ ] Produces prioritized plan, risk register, owner checklist, launch copy suggestions, and follow-up questions.
- [ ] Asks follow-up questions when owners, metrics, assets, risk posture, or rollback details are missing.
- [ ] Does not invent dates, owners, or compliance status when absent.

## Frontend Flow

- [ ] User can edit product brief, audience, launch date, constraints, and assets.
- [ ] Generate button starts the stream and disables while streaming.
- [ ] Progress rail marks observed tool events.
- [ ] Model text appears progressively before the final response.
- [ ] Error state is visible when the API returns an error event.
- [ ] Layout remains usable on desktop and mobile-width screens.

## Tool Outputs

- [ ] Task extraction returns deterministic prioritized tasks.
- [ ] Readiness rubric scores lower when key details are missing.
- [ ] Owner checklists include engineering, product, and go-to-market responsibilities.
- [ ] Channel copy includes email, in-app, changelog, and social variants.

## End-to-End Gate

- [ ] API server is running with a real `OPENAI_API_KEY`.
- [ ] `npm run verify:stream` posts to the local API route.
- [ ] Verifier observes at least one `tool_progress` event.
- [ ] Verifier observes at least one `model_delta` event.
- [ ] Any OpenAI network/auth failure is diagnosed before claiming completion.
- [ ] `pnpm run smoke` loads the frontend, captures a Playwright Chromium screenshot, checks health, and verifies `tool_progress`, `model_delta`, and `final`.
