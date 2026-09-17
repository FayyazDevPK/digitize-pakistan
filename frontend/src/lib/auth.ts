const ACCESS_KEY = "dp_access_token";
const REFRESH_KEY = "dp_refresh_token";

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
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
  const token = getAccessToken();
  if (!token) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const res = await fetch(`${API_URL}/api/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  return res.json();
}
