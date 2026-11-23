import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Every event the app records, named once. The server writes them and `bun run stats` reads them,
// so both import this list instead of typing the strings. Add your product's events here.
export const EVENT_TYPES = ["opened"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// One SQLite file holds the app's data. Tables are created here, and schema changes
// are additive: add a table or a column, never drop or rename one.
export function openDb(path: string): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    at TEXT NOT NULL
  );`);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`);
  db.exec(`CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT
  );`);
  // One current week: day 0 is Monday, 6 is Sunday.
  db.exec(`CREATE TABLE IF NOT EXISTS plan_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
    recipe_id INTEGER NOT NULL REFERENCES recipes(id)
  );`);
  return db;
}

export function recordEvent(db: Database, type: EventType, at = new Date()): void {
  db.query("INSERT INTO events (type, at) VALUES (?, ?)").run(type, at.toISOString());
}

/** How many events of each type were recorded. Types with none still appear, with 0. */
export function countEvents(db: Database): Record<EventType, number> {
  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>;
  const rows = db.query("SELECT type, COUNT(*) AS n FROM events GROUP BY type").all() as { type: string; n: number }[];
  for (const row of rows) {
    if ((EVENT_TYPES as readonly string[]).includes(row.type)) counts[row.type as EventType] = row.n;
  }
  return counts;
}

export type Ingredient = { name: string; quantity: number | null; unit: string | null };
export type Recipe = { id: number; name: string; ingredients: Ingredient[] };
export type PlanEntry = { id: number; day: number; recipeId: number };

/** Saves a recipe and its ingredient lines together; either all of it is saved or none. */
export function addRecipe(db: Database, recipe: { name: string; ingredients: Ingredient[] }): number {
  return db.transaction(() => {
    const row = db
      .query("INSERT INTO recipes (name, created_at) VALUES (?, ?) RETURNING id")
      .get(recipe.name, new Date().toISOString()) as { id: number };
    const insert = db.query("INSERT INTO ingredients (recipe_id, position, name, quantity, unit) VALUES (?, ?, ?, ?, ?)");
    recipe.ingredients.forEach((ing, i) => insert.run(row.id, i, ing.name, ing.quantity, ing.unit));
    return row.id;
  })();
}

/** Every recipe in the order added, each with its ingredient lines in the order typed. */
export function listRecipes(db: Database): Recipe[] {
  const recipes = db.query("SELECT id, name FROM recipes ORDER BY id").all() as { id: number; name: string }[];
  const lines = db
    .query("SELECT recipe_id, name, quantity, unit FROM ingredients ORDER BY recipe_id, position, id")
    .all() as { recipe_id: number; name: string; quantity: number | null; unit: string | null }[];
  const byRecipe = new Map<number, Ingredient[]>(recipes.map((r) => [r.id, []]));
  for (const l of lines) byRecipe.get(l.recipe_id)?.push({ name: l.name, quantity: l.quantity, unit: l.unit });
  return recipes.map((r) => ({ id: r.id, name: r.name, ingredients: byRecipe.get(r.id) ?? [] }));
}

export function addPlanEntry(db: Database, day: number, recipeId: number): number {
  const row = db.query("INSERT INTO plan_entries (day, recipe_id) VALUES (?, ?) RETURNING id").get(day, recipeId) as { id: number };
  return row.id;
}

/** The week's plan, Monday first, in the order entries were added within a day. */
export function listPlan(db: Database): PlanEntry[] {
  return db.query("SELECT id, day, recipe_id AS recipeId FROM plan_entries ORDER BY day, id").all() as PlanEntry[];
}

export function recipeExists(db: Database, id: number): boolean {
  return db.query("SELECT 1 FROM recipes WHERE id = ?").get(id) !== null;
}
