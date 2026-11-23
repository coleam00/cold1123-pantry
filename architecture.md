# Architecture

## Stack
- Bun (runtime and package manager), TypeScript strict, React + Vite for the UI, Hono on Bun for the API, SQLite through `bun:sqlite`, tests with `bun test`, type check with `tsc --noEmit`.
- Why: the bootcamp's supported stack: same commands on Windows, macOS and Linux. The kit's `stack/` scaffold is copied in before the factory starts, so no phase scaffolds.

## How it runs
- Install: `bun install`
- Develop: `bun run dev` (Vite dev server for the UI with the API server beside it)
- Start (production mode): `bun run start`, one Bun process serving the API and the built UI, reading the port from `PORT` (default 3000)
- Health: `GET /health` answers `200 ok` once the app is ready
- Test everything: `bun run check` (`tsc --noEmit`, then `bun test`). CI runs exactly this.
- The bet's command: `bun run stats`

## Shape
- Browser UI (React) -> HTTP API under `/api` (Hono) -> one SQLite file.
- `src/server/app.ts`: the API routes for recipes, plan, grocery list, pantry, planning sessions and waste log, plus `/health`.
- `src/server/db.ts`: the SQLite file and its tables (schema changes are additive) and `EVENT_TYPES`, the one list of event names.
- `src/server/main.ts`: production entry; reads `PORT` and `DATA_DIR` (default `data/`).
- `src/server/grocery.ts` (new): pure function that builds the grocery list from planned recipes and pantry items. All combining and subtracting rules live here and are unit-tested without a database.
- `src/web/App.tsx`: the first screen. Phase 1 replaces the placeholder with recipes, the week and the list on one screen. Phase 2 adds a pantry screen; Phase 3 adds "Use it up".
- `scripts/stats.ts`: `bun run stats`; reads events and the waste log and prints the five lines in `PRD.md`, with zeros and `-` when empty.
- Data lives in one SQLite file under `DATA_DIR` (default `data/app.db`), created on first start, never committed.

## Data
- Recipe: name, and a list of ingredient lines (name, optional quantity, optional unit).
- Plan entry: a weekday (Monday to Sunday) and a recipe; any number per day; one current week.
- Pantry item: ingredient name; from Phase 2 also optional quantity, unit and use-by date.
- Grocery list: computed on request, never stored. Matching key is the ingredient name lowercased and trimmed, plus the unit exactly as typed (lowercased, trimmed). Lines whose units differ stay separate.
- Events (`EVENT_TYPES`): `planning_started`, `planning_finished`, `pantry_updated`, `item_thrown_out`, each with a timestamp. A finished session is the time from a `planning_started` to the next `planning_finished`.

## Boundaries
- No API keys and no outside services; the app works fully offline.
- No auth: single user, listens on localhost by default.
- Nothing is deleted without a confirmation in the UI.

## Decisions deferred
- Reaching the app from a phone in the store: settled by the "share to phone" release or by binding to the home network; decide after the bet's window.
- Unit conversion (g/kg, ml/l): settled by whether separate lines annoy the owner during the window.
- Drag and drop onto days: settled by whether picking from a list feels slow in Phase 1.
