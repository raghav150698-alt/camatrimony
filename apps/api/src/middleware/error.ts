import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { Env, HonoVariables } from "../types";

type AppContext = Context<{ Bindings: Env; Variables: HonoVariables }>;

/**
 * Global error handler for the Hono app.
 * Catches unhandled errors and returns a consistent JSON error response.
 */
export const errorHandler = (err: Error, c: AppContext) => {
  console.error("[API Error]", err);
  if (err instanceof HTTPException) return c.json({success:false,error:err.message},err.status);
  return c.json({success:false,error:"The service is temporarily unavailable. Please try again."},500);
};

/**
 * Not-found handler returning JSON instead of default HTML.
 */
export const notFoundHandler = (c: AppContext) => {
  return c.json({ error: "Not Found" }, 404);
};
