# Direction

Pantry Pilot is a local web app for a household cook that turns the week's dinner plan and the pantry into a grocery list, and helps use up food before it goes off.

## It is
- A recipe box: recipes with ingredients and quantities.
- A weekly dinner plan: recipes picked per day.
- A grocery list generated from the plan minus the pantry.
- A pantry with optional use-by dates, and "use it up" suggestions for what expires soon.
- A waste log and planning timer that feed `bun run stats`.

## It is not
- A calorie, macro or nutrition tracker.
- A grocery ordering or delivery service.
- A multi-user or account-based app; there is no sign-in and no cloud sync.
- A recipe importer or web scraper (later release).
- A phone-sharing or messaging tool for the list (later release).
- A unit converter or recipe scaler.

## Principles
- The list is never wrong by omission: anything that can't be combined or subtracted is shown, not dropped.
- Fewer taps beats more structure: marking "have it" or "threw it out" is one action.
- Works at 390 px wide; the list is read in the store.
- Data stays on the owner's machine.

## Current release
See `PRD.md`.
