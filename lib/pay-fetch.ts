export async function payFetch(input: string, init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase();
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      let error: unknown;
      try {
        const body = (await response.clone().json()) as { error?: unknown };
        error = body?.error;
      } catch {
        error = undefined;
      }
      console.error(`[lightning] ${method} ${input} failed`, {
        status: response.status,
        error,
      });
    }
    return response;
  } catch (error) {
    console.error(`[lightning] ${method} ${input} failed`, {
      status: 0,
      error: error instanceof Error ? error.message : "network error",
    });
    throw error;
  }
}
