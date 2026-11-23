import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { addPlanEntry, addRecipe, countEvents, listPlan, listRecipes, recipeExists, type Ingredient } from "./db";
import { buildGroceryList } from "./grocery";

/** What the UI shows: every recipe, the week's plan, and the grocery list computed from them now. */
function state(db: Database) {
  const recipes = listRecipes(db);
  const plan = listPlan(db);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const groceryList = buildGroceryList(plan.map((e) => byId.get(e.recipeId) ?? { ingredients: [] }));
  return { recipes, plan, groceryList };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function parseRecipe(body: unknown): Parsed<{ name: string; ingredients: Ingredient[] }> {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Send a recipe." };
  const b = body as { name?: unknown; ingredients?: unknown };
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (name === "") return { ok: false, error: "Give the recipe a name." };
  if (!Array.isArray(b.ingredients) || b.ingredients.length === 0) {
    return { ok: false, error: "Add at least one ingredient." };
  }
  const ingredients: Ingredient[] = [];
  for (const raw of b.ingredients as unknown[]) {
    const i = (typeof raw === "object" && raw !== null ? raw : {}) as { name?: unknown; quantity?: unknown; unit?: unknown };
    const ingName = typeof i.name === "string" ? i.name.trim() : "";
    if (ingName === "") return { ok: false, error: "Every ingredient needs a name." };
    let quantity: number | null = null;
    if (i.quantity !== undefined && i.quantity !== null && i.quantity !== "") {
      if (typeof i.quantity !== "number" || !Number.isFinite(i.quantity) || i.quantity <= 0) {
        return { ok: false, error: `The quantity for "${ingName}" must be a number above 0, or left empty.` };
      }
      quantity = i.quantity;
    }
    if (i.unit !== undefined && i.unit !== null && typeof i.unit !== "string") {
      return { ok: false, error: `The unit for "${ingName}" must be text.` };
    }
    const unit = typeof i.unit === "string" && i.unit.trim() !== "" ? i.unit.trim() : null;
    ingredients.push({ name: ingName, quantity, unit });
  }
  return { ok: true, value: { name, ingredients } };
}

async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false };
  }
}

// The API. Every route the UI calls lives under /api. /health answers once the app can serve.
export function createApp(db: Database): Hono {
  const app = new Hono();
  app.get("/health", (c) => c.text("ok"));
  app.get("/api/events/count", (c) => c.json(countEvents(db)));

  app.get("/api/state", (c) => c.json(state(db)));

  app.post("/api/recipes", async (c) => {
    const json = await readJson(c.req.raw);
    if (!json.ok) return c.json({ error: "The request was not valid JSON." }, 400);
    const parsed = parseRecipe(json.body);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    addRecipe(db, parsed.value);
    return c.json(state(db), 201);
  });

  app.post("/api/plan", async (c) => {
    const json = await readJson(c.req.raw);
    if (!json.ok) return c.json({ error: "The request was not valid JSON." }, 400);
    const b = (typeof json.body === "object" && json.body !== null ? json.body : {}) as { day?: unknown; recipeId?: unknown };
    if (typeof b.day !== "number" || !Number.isInteger(b.day) || b.day < 0 || b.day > 6) {
      return c.json({ error: "Pick a day from Monday to Sunday." }, 400);
    }
    const recipeId = b.recipeId;
    if (typeof recipeId !== "number" || !recipeExists(db, recipeId)) {
      return c.json({ error: "That recipe no longer exists." }, 404);
    }
    addPlanEntry(db, b.day, recipeId);
    return c.json(state(db), 201);
  });

  return app;
}
