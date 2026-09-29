const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  body: string;
  retryAfterSeconds: number | null;
  constructor(status: number, body: string, retryAfterSeconds: number | null = null) {
    super(`API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const UPLOAD_SIZE_LIMIT_MB = 20;

function minutesLabel(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

// Shared by both call styles this app uses against the API: apiFetch (throws ApiError) and
// authFetch (returns the raw Response, parsed separately by the caller). Turns a DRF error
// response ({"field": ["msg"]} or {"detail": "msg"}) into a readable sentence, and replaces
// DRF's raw throttle/size-limit responses with copy a user can actually act on.
export function describeApiError(
  status: number,
  body: unknown,
  retryAfterSeconds: number | null,
  fallback = "Something went wrong."
): string {
  if (status === 429) {
    return retryAfterSeconds
      ? `Too many requests. Please try again in about ${minutesLabel(retryAfterSeconds)}.`
      : "Too many requests. Please try again later.";
  }
  if (status === 413) {
    return `That upload is too large — the server allows up to ${UPLOAD_SIZE_LIMIT_MB} MB per request.`;
  }
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.detail === "string") return data.detail;
    for (const v of Object.values(data)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      if (typeof v === "string") return v;
    }
  }
  return fallback;
}

// Turns a caught ApiError (from apiFetch) into the same user-facing copy as describeApiError.
export function apiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) {
    let parsedBody: unknown = null;
    try {
      parsedBody = JSON.parse(err.body);
    } catch {
      // not JSON (e.g. a 413 from a proxy in front of Django) — describeApiError below
      // still handles this status without needing a parsed body.
    }
    return describeApiError(err.status, parsedBody, err.retryAfterSeconds, fallback);
  }
  return fallback;
}

// For authFetch call sites: reads and describes a failed Response's error in one step.
export async function authFetchErrorMessage(res: Response, fallback?: string): Promise<string> {
  const body = await res.json().catch(() => null);
  const retryAfter = Number(res.headers.get("Retry-After"));
  return describeApiError(res.status, body, Number.isFinite(retryAfter) ? retryAfter : null, fallback);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    const retryAfter = Number(res.headers.get("Retry-After"));
    throw new ApiError(res.status, body, Number.isFinite(retryAfter) ? retryAfter : null);
  }

  return res.json();
}

export async function login(username: string, password: string) {
  return apiFetch("/api/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}
