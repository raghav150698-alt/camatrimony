// Interface representing the Cloudflare D1 Database binding shape
export interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  batch: (statements: D1PreparedStatement[]) => Promise<any[]>;
  exec: (query: string) => Promise<any>;
}

export interface D1PreparedStatement {
  bind: (...values: any[]) => D1PreparedStatement;
  first: <T = any>(colName?: string) => Promise<T | null>;
  run: <T = any>() => Promise<{ success: boolean; results?: T[]; meta?: any }>;
  all: <T = any>() => Promise<{ success: boolean; results: T[]; meta?: any }>;
}

let mockDbInstance: any = null;

export function getDB(requestContext?: any): D1Database {
  // 1. Pages/Workers runtime injection check
  const env = requestContext?.env || (process.env as any);
  if (env && env.DB) {
    return env.DB as D1Database;
  }

  // 2. Production fallback stub (prevents bundling mock database in live Workers)
  if (process.env.NODE_ENV === "production") {
    const stubStatement: D1PreparedStatement = {
      bind: function() { return this; },
      first: async () => null,
      run: async () => ({ success: false }),
      all: async () => ({ success: false, results: [] }),
    };

    return {
      prepare: () => stubStatement,
      batch: async () => [],
      exec: async () => ({ success: true }),
    };
  }

  // 3. Local fallback client stub (development/mock mode)
  if (!mockDbInstance) {
    // Use dynamic import to keep mock out of production bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MockD1Database } = require("./mock");
    mockDbInstance = new MockD1Database();
  }
  return mockDbInstance;
}

export type { D1Database as D1DatabaseType, D1PreparedStatement as D1PreparedStatementType } from "./d1-types";
