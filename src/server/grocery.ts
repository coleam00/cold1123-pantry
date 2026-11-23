// The grocery list rules, as one pure function. No database here: the API reads the plan and
// passes the planned recipes in, and the list is computed on every request, never stored.

export type IngredientLine = { name: string; quantity: number | null; unit: string | null };
export type GroceryLine = { name: string; quantity: number | null; unit: string };

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
const round = (x: number) => Math.round(x * 1000) / 1000;

/**
 * Builds the week's grocery list. `planned` has one element per plan entry, so a recipe planned
 * twice counts twice. Lines match on the name (trimmed, any case) and the unit (trimmed, any case).
 * Same name and unit: one line with the quantities summed. A different unit, or a missing quantity,
 * stays a separate line. No line is ever dropped.
 */
export function buildGroceryList(planned: { ingredients: IngredientLine[] }[]): GroceryLine[] {
  const groups = new Map<string, GroceryLine & { key: string }>();
  for (const recipe of planned) {
    for (const line of recipe.ingredients) {
      const name = line.name.trim();
      if (name === "") continue; // the API refuses these; guard only
      const key = name.toLowerCase();
      const unit = norm(line.unit);
      const hasQuantity = line.quantity !== null;
      const groupKey = `${key}|${unit}|${hasQuantity ? "q" : "-"}`;
      const existing = groups.get(groupKey);
      if (!existing) {
        groups.set(groupKey, { key, name, unit, quantity: hasQuantity ? line.quantity : null });
      } else if (hasQuantity) {
        existing.quantity = (existing.quantity ?? 0) + (line.quantity as number);
      }
    }
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        cmp(a.key, b.key) ||
        cmp(a.unit, b.unit) ||
        Number(a.quantity === null) - Number(b.quantity === null),
    )
    .map(({ name, unit, quantity }) => ({ name, quantity: quantity === null ? null : round(quantity), unit }));
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
