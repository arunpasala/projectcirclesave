// lib/client-auth.ts
export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("circlesave_token") || "";
}

export function setToken(token: string) {
  localStorage.setItem("circlesave_token", token);
}

export function clearToken() {
  localStorage.removeItem("circlesave_token");
}
