import { describe, it, expect, vi } from 'vitest';
import { fetchPdfWithProgress } from '../fetchPdfWithProgress';

describe('fetchPdfWithProgress', () => {
  it('fetches PDF with progress callback using ReadableStream', async () => {
    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5]);
    const chunk3 = new Uint8Array([6, 7, 8, 9]);

    const chunks = [chunk1, chunk2, chunk3];
    let index = 0;

    const stream = new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(chunks[index++]);
        } else {
          controller.close();
        }
      },
    });

    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Length': '9' }),
      body: stream,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

    const onProgress = vi.fn();
    const result = await fetchPdfWithProgress('https://example.com/test.pdf', onProgress);

    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 3, 9);
    expect(onProgress).toHaveBeenNthCalledWith(2, 5, 9);
    expect(onProgress).toHaveBeenNthCalledWith(3, 9, 9);

    vi.restoreAllMocks();
  });

  it('handles missing Content-Length header correctly by passing null as totalBytes', async () => {
    const chunk1 = new Uint8Array([10, 20]);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1);
        controller.close();
      },
    });

    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      body: stream,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

    const onProgress = vi.fn();
    const result = await fetchPdfWithProgress('https://example.com/unknown-length.pdf', onProgress);

    expect(result).toEqual(new Uint8Array([10, 20]));
    expect(onProgress).toHaveBeenCalledWith(2, null);

    vi.restoreAllMocks();
  });

  it('throws error when response is not ok', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      headers: new Headers(),
      body: null,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

    const onProgress = vi.fn();
    await expect(fetchPdfWithProgress('https://example.com/404.pdf', onProgress)).rejects.toThrow('PDF request failed: 404');

    vi.restoreAllMocks();
  });
});
