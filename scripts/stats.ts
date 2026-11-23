// `bun run stats`: prints the PRD's bet signal. Phase 1 replaces the numbers with the bet's own,
// keeping two rules: it prints the same format whether or not any data exists yet (zeros on a
// fresh clone), and it reads event names from EVENT_TYPES rather than typing them.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { EVENT_TYPES, countEvents, openDb } from "../src/server/db";

const path = join(process.env.DATA_DIR ?? "data", "app.db");
const counts = existsSync(path)
  ? countEvents(openDb(path))
  : Object.fromEntries(EVENT_TYPES.map((t) => [t, 0]));
for (const type of EVENT_TYPES) console.log(`${type} ${counts[type]}`);
