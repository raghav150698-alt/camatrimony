import type { Context } from "hono";
import type { Env, HonoVariables } from "../types";

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

/**
 * Global error handler for the Hono app.
 * Catches unhandled errors and returns a consistent JSON error response.
 */
export const errorHandler = (err: Error, c: AppContext) => {
  console.error("[API Error]", err);
  return c.json({ error: err?.message || "Internal Server Error" }, 500);
};

/**
 * Not-found handler returning JSON instead of default HTML.
 */
export const notFoundHandler = (c: AppContext) => {
  return c.json({ error: "Not Found" }, 404);
};
