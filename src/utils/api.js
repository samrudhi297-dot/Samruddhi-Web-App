/**
 * Build an absolute or relative API URL.
 * Prefers VITE_API_URL when set (separate API host); otherwise same-origin `/api/...`
 * so Vite proxy / reverse-proxy can forward the request.
 */
export function apiUrl(path) {
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}

/** Parse JSON safely; returns null if the body is not valid JSON. */
export async function readJsonSafe(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
