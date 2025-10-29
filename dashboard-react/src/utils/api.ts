import { config } from "../config/config";

export const API_BASE_URL = config.apiBaseUrl ?? "http://localhost:8001";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export async function getJson<T>(path: string, params: QueryParams = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar ${url.pathname}`);
  }
  return (await response.json()) as T;
}

export function parseDateString(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}


