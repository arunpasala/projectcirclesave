// lib/client-auth.ts
export const TOKEN_KEY = "circlesave_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}
