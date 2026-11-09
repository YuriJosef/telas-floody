export function buildUrl(base, params = {}) {
  const url = new URL(base);
  if (url.protocol !== 'https:') throw new Error('O serviço deve utilizar HTTPS.');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
}
export async function requestJson(url, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 12000);
  try {
    const response = await fetch(buildUrl(url), { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Serviço externo respondeu com erro (${response.status}).`);
    return await response.json();
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
