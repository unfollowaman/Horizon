import { useState, useEffect, useCallback } from 'react';
import { fetchPdfWithProgress } from '../lib/fetchPdfWithProgress';

export type DownloadStage = 'connecting' | 'downloading' | 'preparing' | 'ready';

export interface UsePdfDownloadResult {
  stage: DownloadStage;
  loadedBytes: number;
  totalBytes: number | null;
  data: Uint8Array | null;
  error: string | null;
  setReady: () => void;
}

export function usePdfDownload(url: string | null): UsePdfDownloadResult {
  const [stage, setStage] = useState<DownloadStage>('connecting');
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [data, setData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setStage('connecting');
      setLoadedBytes(0);
      setTotalBytes(null);
      setData(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let isSubscribed = true;

    setStage('connecting');
    setLoadedBytes(0);
    setTotalBytes(null);
    setData(null);
    setError(null);

    const runDownload = async () => {
      try {
        const result = await fetchPdfWithProgress(
          url,
          (loaded, total) => {
            if (!isSubscribed) return;
            setStage('downloading');
            setLoadedBytes(loaded);
            setTotalBytes(total);
          },
          controller.signal
        );

        if (isSubscribed) {
          setData(result);
          setStage('preparing');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : 'Failed to download PDF');
        }
      }
    };

    runDownload();

    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [url]);

  const setReady = useCallback(() => {
    setStage('ready');
  }, []);

  return {
    stage,
    loadedBytes,
    totalBytes,
    data,
    error,
    setReady,
  };
}
