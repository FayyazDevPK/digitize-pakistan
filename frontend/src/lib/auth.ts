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

// User-initiated logout: revokes the refresh token server-side (so it can't
// be replayed against /api/token/refresh/ even if it leaked before logout)
// before clearing local storage. If the revoke call fails for any reason
// (network error, already expired/blacklisted, etc.) we still clear local
// storage and complete the logout — a failed revocation shouldn't trap the
// user in a logged-in state client-side.
export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      await fetch(`${API_URL}/api/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // ignore — still proceed to clear local tokens below
    }
  }
  clearTokens();
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
  has_avatar: boolean;
  phone: string;
  city: string;
  language: string;
  email_digests: boolean;
  date_joined: string;
  password_changed_at: string | null;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getAccessToken()) return null;
  const res = await authFetch("/api/me/");
  if (!res.ok) return null;
  return res.json();
}
