const ACCESS_KEY = "dp_access_token";
const REFRESH_KEY = "dp_refresh_token";

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

async function refreshAccessToken(): Promise<string | null> { const refresh = getRefreshToken();
  if (!refresh) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/api/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await res.json();
  localStorage.setItem(ACCESS_KEY, data.access);
  return data.access;
}

// Fetch wrapper: attaches the access token, and on a 401 (expired token),
// automatically refreshes once and retries the request before giving up.
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  let token = getAccessToken();

  const doFetch = (accessToken: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      res = await doFetch(token);
    }
  }

  return res;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  role: string;
  tier: string;
  tier_expires_at: string | null;
  is_verified_badge: boolean;
  kyc_status: string;
  display_name: string;
  avatar_url: string;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getAccessToken()) return null;
  const res = await authFetch("/api/me/");
  if (!res.ok) return null;
  return res.json();
}
