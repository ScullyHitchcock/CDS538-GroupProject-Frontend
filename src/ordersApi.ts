const API = import.meta.env.VITE_API_URL as string;

export function requestOrdersApi(path: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API}${path}`, { ...options, headers });
}
