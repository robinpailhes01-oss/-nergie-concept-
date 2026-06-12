// ============================================================
// fetch avec retries — les APIs publiques (SIRENE, BAN, ODRÉ)
// ont des micro-pannes fréquentes (503 passagers).
// ============================================================

const RETRY_DELAYS_MS = [600, 1500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRetry(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const r = await fetch(url, init);
      // Retry uniquement sur erreurs serveur (5xx) — les 4xx sont définitifs
      if (r.status < 500) return r;
      lastError = new Error(`HTTP ${r.status}`);
    } catch (err) {
      lastError = err;
    }
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay !== undefined) await sleep(delay);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('fetchRetry: échec après retries');
}
