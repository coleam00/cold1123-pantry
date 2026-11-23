import { Hono } from "hono";
import type { Database } from "bun:sqlite";
import { countEvents } from "./db";

// The API. Every route the UI calls lives under /api. /health answers once the app can serve.
export function createApp(db: Database): Hono {
  const app = new Hono();
  app.get("/health", (c) => c.text("ok"));
  app.get("/api/events/count", (c) => c.json(countEvents(db)));
  return app;
}
