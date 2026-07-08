import axios from "axios";

/**
 * In dev VITE_API_BASE_URL stays empty and requests go through the Vite proxy;
 * in production builds it points at the deployed backend origin.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
});

/** Resolve a backend-relative upload path (e.g. "/uploads/abc.jpg") to a full URL. */
export function uploadUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}
