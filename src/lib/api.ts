/** Thin fetch wrapper: always resolves to data or throws an ApiError with a user-friendly message. */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      typeof navigator !== "undefined" && !navigator.onLine
        ? "You appear to be offline. Reconnect and try again."
        : "Couldn't reach the server. Please try again.",
      "network",
      0,
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? "Something went wrong. Please try again.", data?.error?.code ?? "unknown", res.status);
  }
  return data as T;
}
