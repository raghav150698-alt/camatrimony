import type { MiddlewareHandler } from 'hono';
import type { Env, HonoVariables } from '../types';

export function rateLimit(options: {windowMs: number; max: number; keyBy?: 'user' | 'ip'; message?: string}): MiddlewareHandler<{Bindings: Env; Variables: HonoVariables}> {
  return async (c, next) => {
    const namespace = c.env.RATE_LIMITER;
    if (!namespace) return next();
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const identity = options.keyBy === 'user' ? c.get('user')?.id || c.get('admin')?.id || ip : ip;
    const key = `${c.req.method}:${c.req.path}:${identity}`;
    let result: {allowed: boolean; resetAt: number};
    try {
      const response = await namespace.get(namespace.idFromName(key)).fetch('https://rate-limiter/check', {
        method: 'POST', body: JSON.stringify({key, windowMs: options.windowMs, max: options.max}),
      });
      if (!response.ok) throw new Error('Limiter unavailable');
      result = await response.json();
      if (typeof result.allowed !== 'boolean' || !Number.isFinite(result.resetAt)) throw new Error('Invalid limiter response');
    } catch {
      return c.json({error: 'Please try again shortly.'}, 503);
    }
    if (!result.allowed) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))));
      return c.json({error: options.message || 'Too many requests. Please try again later.'}, 429);
    }
    await next();
  };
}
