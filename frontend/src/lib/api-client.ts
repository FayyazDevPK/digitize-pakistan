const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

// Turns a DRF error response ({"field": ["msg"]} or {"detail": "msg"}) into a readable sentence.
export function apiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) {
    try {
      const data = JSON.parse(err.body);
      if (typeof data.detail === "string") return data.detail;
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      }
    } catch {
      // not JSON — fall through
    }
    if (err.status === 429) return "Too many attempts. Please try again later.";
  }
  return fallback;
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
    throw new ApiError(res.status, body);
  }

  return res.json();
}

export async function login(username: string, password: string) {
  return apiFetch("/api/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}
