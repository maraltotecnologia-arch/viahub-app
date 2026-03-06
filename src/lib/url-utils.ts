/**
 * Returns the base URL for the current environment.
 * - Production: https://viahub.app
 * - Lovable preview/dev: window.location.origin
 * - Local dev: http://localhost:5173
 */
export function getBaseUrl(): string {
  if (typeof window === "undefined") return "https://viahub.app";

  const hostname = window.location.hostname;

  // Produção
  if (hostname === "viahub.app" || hostname === "www.viahub.app") {
    return "https://viahub.app";
  }

  // Ambiente Lovable de preview/teste
  if (hostname.includes("lovable.app") || hostname.includes("lovable.dev")) {
    return window.location.origin;
  }

  // Desenvolvimento local
  return window.location.origin;
}
