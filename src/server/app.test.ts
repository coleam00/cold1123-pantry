import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { createApp } from "./app";
import { openDb, recordEvent } from "./db";

let dir: string;
let db: Database;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "app-test-"));
  db = openDb(join(dir, "app.db"));
});

afterEach(() => {
  db.close(); // close before deleting: Windows refuses to delete an open file
  rmSync(dir, { recursive: true, force: true });
});

test("health answers ok", async () => {
  const res = await createApp(db).request("/health");
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("ok");
});

test("events are counted by type, with zeros for types not seen", async () => {
  expect(await (await createApp(db).request("/api/events/count")).json()).toEqual({ opened: 0 });
  recordEvent(db, "opened");
  recordEvent(db, "opened");
  expect(await (await createApp(db).request("/api/events/count")).json()).toEqual({ opened: 2 });
});

test("stats prints the same format with no database at all", () => {
  const empty = mkdtempSync(join(tmpdir(), "stats-test-"));
  try {
    const p = Bun.spawnSync(["bun", "scripts/stats.ts"], { env: { ...process.env, DATA_DIR: empty }, stdout: "pipe" });
    expect(p.stdout.toString().trim()).toBe("opened 0");
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});
