import { config } from "../config/config";

// Se apiBaseUrl estiver vazio, usa caminho relativo (proxy do Vite intercepta /api)
export const API_BASE_URL = config.apiBaseUrl || '';

export type QueryParams = Record<string, string | number | boolean | undefined>;

export async function getJson<T>(path: string, params: QueryParams = {}): Promise<T> {
  // Se API_BASE_URL estiver vazio, usa caminho relativo (proxy do Vite intercepta /api)
  const fullPath = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  
  const url = new URL(fullPath, window.location.origin);
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


