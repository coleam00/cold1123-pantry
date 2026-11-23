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

const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) =>
  app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function planTwoRecipes(app: ReturnType<typeof createApp>) {
  const a = await post(app, "/api/recipes", {
    name: "Curry",
    ingredients: [
      { name: "Onion", quantity: 2, unit: "pcs" },
      { name: "rice", quantity: 500, unit: "g" },
    ],
  });
  expect(a.status).toBe(201);
  const b = await post(app, "/api/recipes", {
    name: "Pilaf",
    ingredients: [
      { name: " onion ", quantity: 1, unit: "pcs" },
      { name: "rice", quantity: 1, unit: "kg" },
      { name: "salt", quantity: "", unit: "" },
    ],
  });
  expect(b.status).toBe(201);
  const { recipes } = (await b.json()) as { recipes: { id: number; name: string }[] };
  expect(recipes.map((r) => r.name)).toEqual(["Curry", "Pilaf"]);
  expect((await post(app, "/api/plan", { day: 0, recipeId: recipes[0]!.id })).status).toBe(201);
  expect((await post(app, "/api/plan", { day: 2, recipeId: recipes[1]!.id })).status).toBe(201);
}

test("two recipes on two days give one combined grocery list", async () => {
  const app = createApp(db);
  await planTwoRecipes(app);
  const state = (await (await app.request("/api/state")).json()) as { plan: { day: number }[]; groceryList: unknown };
  expect(state.plan.map((e) => e.day)).toEqual([0, 2]);
  expect(state.groceryList).toEqual([
    { name: "Onion", quantity: 3, unit: "pcs" },
    { name: "rice", quantity: 500, unit: "g" },
    { name: "rice", quantity: 1, unit: "kg" },
    { name: "salt", quantity: null, unit: "" },
  ]);
});

test("an empty app has no recipes, no plan and an empty list", async () => {
  expect(await (await createApp(db).request("/api/state")).json()).toEqual({ recipes: [], plan: [], groceryList: [] });
});

test("bad recipes and plan entries are refused and nothing is saved", async () => {
  const app = createApp(db);
  const bad = [
    { name: "  ", ingredients: [{ name: "x", quantity: 1, unit: "g" }] },
    { name: "Soup", ingredients: [] },
    { name: "Soup" },
    { name: "Soup", ingredients: [{ name: " ", quantity: 1 }] },
    { name: "Soup", ingredients: [{ name: "leek", quantity: -1 }] },
    { name: "Soup", ingredients: [{ name: "leek", quantity: 0 }] },
    { name: "Soup", ingredients: [{ name: "leek", quantity: "two" }] },
    { name: "Soup", ingredients: [{ name: "leek", unit: 5 }] },
  ];
  for (const body of bad) {
    const res = await post(app, "/api/recipes", body);
    expect(res.status).toBe(400);
    expect(typeof ((await res.json()) as { error: unknown }).error).toBe("string");
  }
  const notJson = await app.request("/api/recipes", { method: "POST", body: "{nope" });
  expect(notJson.status).toBe(400);

  const ok = await post(app, "/api/recipes", { name: "Soup", ingredients: [{ name: "leek" }] });
  const { recipes } = (await ok.json()) as { recipes: { id: number }[] };
  expect((await post(app, "/api/plan", { day: 7, recipeId: recipes[0]!.id })).status).toBe(400);
  expect((await post(app, "/api/plan", { day: 1.5, recipeId: recipes[0]!.id })).status).toBe(400);
  expect((await post(app, "/api/plan", { day: 0, recipeId: 999 })).status).toBe(404);

  const state = (await (await app.request("/api/state")).json()) as { recipes: unknown[]; plan: unknown[] };
  expect(state.recipes).toHaveLength(1);
  expect(state.plan).toEqual([]);
});

test("recipes and the plan are still there after the database is reopened", async () => {
  await planTwoRecipes(createApp(db));
  const before = await (await createApp(db).request("/api/state")).json();
  db.close();
  db = openDb(join(dir, "app.db")); // assigned back so afterEach closes it before deleting the folder
  const after = await (await createApp(db).request("/api/state")).json();
  expect(after).toEqual(before);
  expect((after as { recipes: unknown[] }).recipes).toHaveLength(2);
});
