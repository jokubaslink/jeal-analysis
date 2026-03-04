const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const AUTH_TOKEN_STORAGE_KEY =
  import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY || "jeal_auth_token";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (typeof payload === "object" && payload !== null && payload.detail !== undefined) {
      const d = payload.detail;
      message = Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join("; ") : String(d);
    }
    throw new Error(message);
  }

  return payload;
}

export { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY };
