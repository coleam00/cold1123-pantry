# Pantry Pilot: plan the week in minutes, buy only what you don't have

> **Release:** first release · **Kind:** web app · **Owner:** coleam00

## Problem

A busy household cook (two adults, 4 to 5 dinners a week) spends about 45 minutes every Sunday planning the week and writing the grocery list. Recipes live in screenshots and bookmarks, the list lives in a notes app, and the pantry is checked by eye. They still buy things they already have, and vegetables get thrown out most weeks.

## Evidence

- Weekly planning plus list writing takes about 45 minutes every Sunday (the owner's own estimate).
- Vegetables are thrown out "most weeks" (the owner's observation). Assumption: the count is between 2 and 6 items a week. Validate with the first week of the waste log.
- Assumption: the owner will keep the pantry up to date if marking an item takes one tap from the grocery list. Validate by `bun run stats` showing a pantry update in each of the three weeks.

## Why build it, and why now

Today the list is retyped by hand from recipes scattered across apps, and the pantry check is a walk to the fridge. If the list writes itself from the week's plan and drops what is already in the kitchen, the Sunday chore shrinks to choosing dinners. Suggestions that use up food about to go off turn waste into dinners. Grocery prices went up, so both the duplicate buys and the waste now cost more than they did.

## Users and the job

- **Primary user:** the household cook, planning on a laptop on Sunday and reading the list on a phone-sized screen.
- **Job:** When I plan the week's dinners, I want the grocery list to write itself from the plan minus what I already have, so I can shop once without buying duplicates or wasting food.
- **Not for:** people tracking calories or nutrition, or anyone who wants groceries ordered and delivered.

## The bet

- **Hypothesis:** If we ship Pantry Pilot, the owner will finish weekly planning (plan to finished grocery list) in under 15 minutes and log less thrown-out food each week, because the list is generated from the plan and the pantry instead of written by hand.
- **Signal:** median minutes per finished planning session, items logged as thrown out per week, and the number of weeks with at least one pantry update.
- **Command:** `bun run stats` prints exactly these five lines (zeros and `-` when there is no data):
  ```
  Pantry Pilot stats (last 21 days)
  planning sessions finished: <n>
  median planning minutes: <m.m or ->
  thrown out per week, oldest first: <a>, <b>, <c>
  weeks with a pantry update: <k> of 3
  ```
  Phase 1 builds this command.
- **Threshold:** median planning minutes below 15, thrown out in the last week lower than in the first week, and a pantry update in 3 of 3 weeks.
- **Window:** three consecutive Sundays (21 days) starting the Sunday after Phase 3 merges.
- **Wrong if:** median planning minutes above 30, or `weeks with a pantry update` is 1 of 3 or fewer (the pantry was abandoned after the first week).

## Outcome

- The owner keeps recipes with ingredients and quantities in one place.
- The owner picks recipes for days of the week and gets a grocery list that combines matching ingredients.
- Anything already in the pantry is removed from or reduced on the list.
- Pantry items can carry a use-by date, and items expiring within 3 days are surfaced with recipes that use them.
- Thrown-out food is logged in one tap, and planning time is measured without extra effort.

## Invariants

- No account and no sign-in; all data stays on the owner's machine.
- Every screen is usable at 390 px wide.
- The grocery list never silently drops an ingredient it could not combine or subtract; it lists it separately.
- Nothing the owner entered is deleted without a confirmation.

## Acceptance

- [ ] Two recipes sharing an ingredient in the same unit, placed on two days, produce one grocery line with the summed quantity.
- [ ] An ingredient in a different unit from the same ingredient elsewhere appears as its own line, never dropped.
- [ ] Marking a list item as "have it" removes it from the list, and it stays removed after a restart.
- [ ] A pantry item with a use-by date within 3 days appears in "Use it up" with at least one recipe that contains it.
- [ ] Logging an item as thrown out increases this week's count in `bun run stats`.
- [ ] At 390 px wide, the plan, list and pantry screens show no horizontal scrolling.

## Phases

The factory files one phase at a time. Each phase leaves the product working.

### Phase 1: Recipes to a grocery list

- **Proves:** a plan turns into a combined grocery list that drops what the owner already has.
- **Outcome:** the owner adds two recipes with ingredients, puts them on two days, sees one combined list, marks an item "have it", and watches it drop off; all of it survives a restart.
- **Acceptance:**
  - [ ] The app starts with one command, and the owner can add two recipes, place them on two days, see a combined grocery list, mark an item "have it" and see it drop off, start to finish on one screen.
  - [ ] Ingredients with the same name and unit combine into one line with the summed quantity; same name with a different unit shows as a separate line.
  - [ ] Recipes, the plan and "have it" items are still there after the app is stopped and started again.
  - [ ] `bun run stats` exists and prints its five lines, even if the numbers are zero; pressing "Start planning" then "List done" adds one finished session.
  - [ ] One command runs every test, and CI runs it on every pull request.
- **Before Phase 2 is filed:** Phase 1 is merged, and the owner runs the flow above once by hand and `bun run stats` shows `planning sessions finished: 1`.

### Phase 2: A real pantry

- **Proves:** the list subtracts what is in the kitchen, not just what was ticked off.
- **Outcome:** the owner keeps a pantry with optional quantities and use-by dates; the list subtracts pantry quantities in the same unit and lists the rest separately.
- **Acceptance:**
  - [ ] A pantry screen lists items with optional quantity, unit and use-by date; the owner can add, edit and remove (with confirmation) an item.
  - [ ] A pantry item of 200 g rice against a list need of 500 g rice leaves a list line of 300 g rice.
  - [ ] A pantry item in a different unit from the list need leaves the list line in place, marked "check pantry: you have <qty> <unit>".
  - [ ] Every pantry change counts toward `weeks with a pantry update`.
  - [ ] At 390 px wide, the plan, list and pantry screens show no horizontal scrolling.
- **Before Phase 3 is filed:** Phase 2 is merged, and the 200 g / 500 g rice check passes by hand.

### Phase 3: Use it up and the waste log

- **Proves:** expiring food is turned into dinners, and waste is measured.
- **Outcome:** the owner sees items expiring within 3 days with recipes that use them, can put a suggested recipe on a day, and logs thrown-out items in one tap.
- **Acceptance:**
  - [ ] A "Use it up" section lists pantry items whose use-by date is today or within the next 3 days, each with the recipes that contain that ingredient.
  - [ ] Choosing a suggested recipe places it on a day the owner picks.
  - [ ] "Threw it out" on a pantry item logs it, removes it from the pantry, and increases this week's count in `bun run stats`.
  - [ ] An item with no use-by date never appears in "Use it up".
- **Before the bet's window starts:** Phase 3 is merged, and logging one test item as thrown out shows `1` in the newest week of `bun run stats`.

## Non-goals

- Calorie or nutrition tracking.
- Ordering groceries online, or accounts of any kind.
- Importing a recipe from a web page (later release).
- Sending or syncing the grocery list to a phone (later release).
- Converting between units (grams to kilograms, cups to millilitres).
- Scaling recipes by servings.

## Open questions

- [ ] Confirm: you pick a recipe for a day from a list rather than dragging it; drag is a later polish. Settle by trying Phase 1.
- [ ] Confirm: the plan covers one week, Monday to Sunday, with any number of recipes per day.
- [ ] Confirm: ingredients match by name ignoring case and surrounding spaces, and quantities combine only when units match exactly; no unit conversion this release.
- [ ] Confirm: a planning session is timed from pressing "Start planning" to pressing "List done", rather than from opening the app. Unfinished sessions are not counted.
- [ ] Confirm: in Phase 1 the pantry is just "have it" ticks with no quantity; quantities and use-by dates arrive in Phase 2.
- [ ] Confirm: "throw out less" is judged as the last week's thrown-out count being lower than the first week's, because there is no baseline from before the app.
- [ ] Confirm: the app runs on one computer and the phone is only a screen size target; reading the list on your phone in the store needs either the same network or the later "share to phone" release. Is that acceptable for three weeks of Sundays?
- [ ] Confirm: removing a recipe, plan entry or pantry item asks for confirmation.
- [x] Confirm: the Owner line uses the real GitHub login (coleam00).
