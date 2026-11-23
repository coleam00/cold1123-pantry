# Engineering

- **One command checks everything:** `bun run check` runs type checks and every test. Every change keeps it green.
- **Tests:** every behavior change comes with a test that fails without it. Tests are `*.test.ts` beside the code, run by `bun test`. Grocery list rules (combine, subtract, keep separate) are tested as a pure function with table-style cases; API tests use a temporary `DATA_DIR`.
- **Runs everywhere:** commands and scripts work on Windows, macOS and Linux, and CI runs the checks on Linux and Windows. No bash-only scripts in the app, and no hard-coded paths or path separators. Tests close every file and database handle before deleting their temporary folders (Windows refuses to delete an open file).
- **Dependencies:** add one only when it removes real work. Say why in the pull request.
- **Data:** never commit the `data/` folder; schema changes are additive.
- **The list never drops an ingredient:** any code path that can't combine or subtract a line keeps it on the list, separately. A test covers each such path.
- **Failures are never silent:** a save or load that fails shows the user an error and keeps what they typed. Once the user's data is saved, the request succeeds even if a follow-up write (an event) fails; log that failure instead of reporting the save as failed, so a retry never duplicates data.
- **UI state follows the server:** after each request, update the screen from what the server returned (or a functional state update), never from a copy taken before the request, so two quick actions can't overwrite each other.
- **Event and status names live in one list** (`EVENT_TYPES` in `src/server/db.ts`); code imports it rather than typing the strings.
- **Secrets:** none are needed. If one is ever added, read it from the environment and list it in `.env.example` with a fake value.
- **UI:** every screen works at 390 px wide with no horizontal scrolling; controls are keyboard-reachable; deletes ask for confirmation.
- **Small changes:** one outcome per pull request.
