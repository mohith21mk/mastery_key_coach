/**
 * Normalize authentication payloads returned by the supported MKC backends.
 *
 * Netlify Functions returns { user: User }, while the legacy FastAPI backend
 * returns User directly. The React application consumes a User object.
 */
export function extractAuthUser(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload.user ?? payload;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }

  if (candidate.id === undefined || candidate.id === null) {
    return null;
  }

  return candidate;
}
