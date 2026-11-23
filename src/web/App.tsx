import { Fragment, useEffect, useState, type CSSProperties, type FormEvent } from "react";

// The one screen: the week's grocery list, the week's plan, and a form to add a recipe.
// Every request's response replaces the whole state, so the screen always shows what the server has.

type Ingredient = { name: string; quantity: number | null; unit: string | null };
type Recipe = { id: number; name: string; ingredients: Ingredient[] };
type PlanEntry = { id: number; day: number; recipeId: number };
type GroceryLine = { name: string; quantity: number | null; unit: string };
type State = { recipes: Recipe[]; plan: PlanEntry[]; groceryList: GroceryLine[] };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Row = { name: string; quantity: string; unit: string };
const emptyRow = (): Row => ({ name: "", quantity: "", unit: "" });

const input: CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", font: "inherit", padding: "0.4rem" };
const section: CSSProperties = { marginBottom: "2rem" };
const errorText: CSSProperties = { color: "#b00020" };
const visuallyHidden: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

/** POSTs JSON and returns the new state, or throws an Error carrying the message to show. */
async function postState(path: string, body: unknown): Promise<State> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Could not reach the app. Check it is running and try again.");
  }
  const data = (await res.json().catch(() => null)) as (State & { error?: string }) | null;
  if (!res.ok || data === null) throw new Error(data?.error ?? `Saving failed (${res.status}). Try again.`);
  return data;
}

function formatLine(l: GroceryLine): string {
  return [l.quantity === null ? "" : String(l.quantity), l.unit, l.name].filter((p) => p !== "").join(" ");
}

export function App() {
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error();
      setState((await res.json()) as State);
    } catch {
      setLoadError("Could not load your recipes and plan.");
    }
  };
  useEffect(() => {
    void load();
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "1rem auto", padding: "0 1rem" }}>
      <h1>Pantry Pilot</h1>
      {loadError && (
        <p role="alert" style={errorText}>
          {loadError}{" "}
          <button type="button" onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      {state === null && !loadError && <p>Loading…</p>}
      {state && (
        <>
          <GroceryList state={state} />
          <Week state={state} onState={setState} />
          <RecipeForm onState={setState} />
        </>
      )}
    </main>
  );
}

function GroceryList({ state }: { state: State }) {
  return (
    <section style={section} aria-labelledby="list-heading">
      <h2 id="list-heading">Grocery list</h2>
      {state.groceryList.length === 0 ? (
        <p>Nothing to buy yet. Put recipes on days of the week below.</p>
      ) : (
        <ul>
          {state.groceryList.map((l, i) => (
            <li key={i}>{formatLine(l)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Week({ state, onState }: { state: State; onState: (s: State) => void }) {
  const names = new Map(state.recipes.map((r) => [r.id, r.name]));
  return (
    <section style={section} aria-labelledby="week-heading">
      <h2 id="week-heading">This week</h2>
      {state.recipes.length === 0 && <p>Add a recipe below, then put it on a day.</p>}
      {DAYS.map((label, day) => (
        <Day
          key={day}
          day={day}
          label={label}
          recipes={state.recipes}
          planned={state.plan.filter((e) => e.day === day).map((e) => ({ id: e.id, name: names.get(e.recipeId) ?? "?" }))}
          onState={onState}
        />
      ))}
    </section>
  );
}

function Day(props: {
  day: number;
  label: string;
  recipes: Recipe[];
  planned: { id: number; name: string }[];
  onState: (s: State) => void;
}) {
  const { day, label, recipes, planned, onState } = props;
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = choice || String(recipes[0]?.id ?? "");
  const id = `day-${day}`;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      onState(await postState("/api/plan", { day, recipeId: Number(selected) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #ddd", padding: "0.5rem 0" }}>
      <h3 style={{ margin: "0.25rem 0", fontSize: "1rem" }}>{label}</h3>
      {planned.length > 0 && (
        <ul style={{ margin: "0.25rem 0" }}>
          {planned.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <label htmlFor={id} style={visuallyHidden}>
          Recipe for {label}
        </label>
        <select
          id={id}
          value={selected}
          disabled={recipes.length === 0 || busy}
          onChange={(e) => setChoice(e.target.value)}
          style={{ ...input, flex: "1 1 10rem", width: "auto" }}
        >
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void add()} disabled={recipes.length === 0 || busy} aria-label={`Add to ${label}`}>
          Add
        </button>
      </div>
      {error && (
        <p role="alert" style={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

function RecipeForm({ onState }: { onState: (s: State) => void }) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Fully blank rows are left out; a half-filled row is sent so the server can say what is missing.
    const filled = rows.filter((r) => r.name.trim() !== "" || r.quantity.trim() !== "" || r.unit.trim() !== "");
    const ingredients = filled.map((r) => ({
      name: r.name,
      quantity: quantityToSend(r.quantity),
      unit: r.unit,
    }));
    try {
      onState(await postState("/api/recipes", { name, ingredients }));
      setName("");
      setRows([emptyRow()]);
    } catch (err) {
      setError((err as Error).message); // what the user typed stays in the form
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={section} aria-labelledby="recipe-heading">
      <h2 id="recipe-heading">Add a recipe</h2>
      <form onSubmit={(e) => void save(e)}>
        <label htmlFor="recipe-name">Recipe name</label>
        <input id="recipe-name" value={name} onChange={(e) => setName(e.target.value)} style={input} />
        <fieldset style={{ border: "none", padding: 0, margin: "1rem 0", minWidth: 0 }}>
          <legend>Ingredients</legend>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 5rem 5rem", gap: "0.5rem", fontSize: "0.9rem" }}>
            <span aria-hidden="true">Name</span>
            <span aria-hidden="true">Quantity</span>
            <span aria-hidden="true">Unit</span>
            {rows.map((r, i) => (
              <Fragment key={i}>
                <input
                  aria-label={`Ingredient ${i + 1} name`}
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  style={input}
                />
                <input
                  aria-label={`Ingredient ${i + 1} quantity`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={r.quantity}
                  onChange={(e) => setRow(i, { quantity: e.target.value })}
                  style={input}
                />
                <input
                  aria-label={`Ingredient ${i + 1} unit`}
                  value={r.unit}
                  onChange={(e) => setRow(i, { unit: e.target.value })}
                  style={input}
                />
              </Fragment>
            ))}
          </div>
          <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])} style={{ marginTop: "0.5rem" }}>
            Add ingredient
          </button>
        </fieldset>
        <button type="submit" disabled={busy}>
          Save recipe
        </button>
        {error && (
          <p role="alert" style={errorText}>
            {error}
          </p>
        )}
      </form>
    </section>
  );
}


/** '' is "no quantity". Anything that isn't a finite number is sent as typed so the server refuses it with a message. */
function quantityToSend(typed: string): number | string | null {
  if (typed.trim() === "") return null;
  const n = Number(typed);
  return Number.isFinite(n) ? n : typed;
}
