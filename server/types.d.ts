/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  GOOGLE_CALENDAR_ACCESS_TOKEN?: string;
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  EVOLUTION_INSTANCE?: string;
}