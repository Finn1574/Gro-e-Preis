const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "string" ? data : data?.error || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export const buildPlayerJoinUrl = (gameId: string): string => {
  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  return `${baseUrl.replace(/\/$/, "")}/play/join?gameId=${encodeURIComponent(gameId)}`;
};
