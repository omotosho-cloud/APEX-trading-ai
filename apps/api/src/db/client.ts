import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const pgUrl = process.env.DATABASE_URL;
const tsUrl = process.env.TIMESCALE_URL;

if (!pgUrl) throw new Error("DATABASE_URL is required");
if (!tsUrl) throw new Error("TIMESCALE_URL is required");

const pgClient = postgres(pgUrl, { max: 10 });
const tsClient = postgres(tsUrl, { max: 10 });

export const db = drizzle(pgClient, { schema });
export const tsdb = drizzle(tsClient, { schema });
