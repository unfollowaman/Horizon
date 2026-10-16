export async function fetchPdfWithProgress(
  url: string,
  onProgress: (loaded: number, total: number | null) => void,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`PDF request failed: ${res.status}`);
  }

  const contentLength = res.headers.get('Content-Length');
  const total = contentLength ? Number(contentLength) || 0 : 0;

  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress(buf.length, buf.length > 0 ? buf.length : null);
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress(loaded, total || null);
    }
  }

  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
