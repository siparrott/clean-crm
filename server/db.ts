import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";

neonConfig.webSocketConstructor = ws;

// Neon-only database connection (Supabase removed)
const neonUrl = process.env.DATABASE_URL;

if (!neonUrl) {
  throw new Error("DATABASE_URL must be set - provide your Neon connection string");
}

export const pool = new Pool({ 
  connectionString: neonUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

console.log(`📊 Database: Neon connection (Supabase-free architecture)`);