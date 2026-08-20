import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl());
}

type Sql = NeonQueryFunction<false, false>;

let client: Sql | null = null;

export function sql(): Sql {
  const url = databaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!client) {
    client = neon(url, { arrayMode: false, fullResults: false });
  }
  return client;
}
