import { expect, test } from "bun:test";
import { buildGroceryList, type GroceryLine, type IngredientLine } from "./grocery";

const recipe = (...ingredients: [string, number | null, string | null][]): { ingredients: IngredientLine[] } => ({
  ingredients: ingredients.map(([name, quantity, unit]) => ({ name, quantity, unit })),
});

const cases: { name: string; planned: { ingredients: IngredientLine[] }[]; expected: GroceryLine[] }[] = [
  {
    name: "same name and unit across two recipes combine into one summed line",
    planned: [recipe(["onion", 2, "pcs"]), recipe(["onion", 1, "pcs"])],
    expected: [{ name: "onion", quantity: 3, unit: "pcs" }],
  },
  {
    name: "same name with a different unit stays a separate line",
    planned: [recipe(["rice", 500, "g"]), recipe(["rice", 1, "kg"])],
    expected: [
      { name: "rice", quantity: 500, unit: "g" },
      { name: "rice", quantity: 1, unit: "kg" },
    ],
  },
  {
    name: "name and unit match ignoring case and surrounding spaces",
    planned: [recipe([" Onion ", 100, " G "]), recipe(["onion", 50, "g"])],
    expected: [{ name: "Onion", quantity: 150, unit: "g" }],
  },
  {
    name: "missing unit on both lines combines with an empty unit",
    planned: [recipe(["egg", 2, null]), recipe(["egg", 3, ""])],
    expected: [{ name: "egg", quantity: 5, unit: "" }],
  },
  {
    name: "missing unit and a unit stay separate",
    planned: [recipe(["flour", 2, null]), recipe(["flour", 200, "g"])],
    expected: [
      { name: "flour", quantity: 2, unit: "" },
      { name: "flour", quantity: 200, unit: "g" },
    ],
  },
  {
    name: "missing quantity is its own line, not merged into a quantity line",
    planned: [recipe(["salt", null, null], ["salt", 1, "tsp"]), recipe(["Salt", null, null])],
    expected: [
      { name: "salt", quantity: null, unit: "" },
      { name: "salt", quantity: 1, unit: "tsp" },
    ],
  },
  {
    name: "missing quantity with the same unit is still kept separately",
    planned: [recipe(["milk", 1, "l"], ["milk", null, "l"])],
    expected: [
      { name: "milk", quantity: 1, unit: "l" },
      { name: "milk", quantity: null, unit: "l" },
    ],
  },
  {
    name: "the same recipe planned twice counts twice",
    planned: [recipe(["pasta", 250, "g"]), recipe(["pasta", 250, "g"])],
    expected: [{ name: "pasta", quantity: 500, unit: "g" }],
  },
  {
    name: "an empty plan gives an empty list",
    planned: [],
    expected: [],
  },
  {
    name: "sums hide float noise",
    planned: [recipe(["oil", 0.1, "l"]), recipe(["oil", 0.2, "l"])],
    expected: [{ name: "oil", quantity: 0.3, unit: "l" }],
  },
  {
    name: "output is sorted by name, then unit",
    planned: [recipe(["tomato", 2, null], ["Basil", 1, "bunch"], ["tomato", 400, "g"], ["apple", 3, null])],
    expected: [
      { name: "apple", quantity: 3, unit: "" },
      { name: "Basil", quantity: 1, unit: "bunch" },
      { name: "tomato", quantity: 2, unit: "" },
      { name: "tomato", quantity: 400, unit: "g" },
    ],
  },
  {
    name: "the first spelling seen is the one shown",
    planned: [recipe(["Garlic", 1, "clove"]), recipe(["GARLIC", 2, "Clove"])],
    expected: [{ name: "Garlic", quantity: 3, unit: "clove" }],
  },
];

for (const c of cases) {
  test(c.name, () => {
    expect(buildGroceryList(c.planned)).toEqual(c.expected);
  });
}
