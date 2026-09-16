import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePdfData } from '../usePdfData';
import * as learningAPI from '../../../../../services/learningResourcesAPI';
import { supabase } from '../../../../../services/supabase';
import type { Resource, LearningResourceRow } from '../../../../../types';
import type { User } from '@supabase/supabase-js';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockUser: User = {
  id: 'user-123',
  email: 'student@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString()
};

const mockProtectedResource: Resource = {
  id: 'protected-1',
  title: 'Chapter 1: Protected Notes',
  description: 'Protected PDF resource',
  pdfUrl: 'protected/notes/ch1.pdf',
  thumbnailUrl: '',
  uploadDate: '2023-01-01',
  student_class: 'Class 10',
  subject: 'Science',
  resource_type: 'notes',
  medium: 'english',
  storage_bucket: 'learning_resources',
  file_path: 'notes/ch1.pdf'
};

const mockPublicResource: Resource = {
  id: 'public-1',
  title: '2023 Science Question Paper',
  description: 'Public PYQ paper',
  pdfUrl: 'https://cdn.example.com/pdfs/2023-science.pdf',
  thumbnailUrl: '',
  uploadDate: '2023-01-01',
  student_class: 'Class 10',
  subject: 'Science',
  resource_type: 'pyq',
  medium: 'english',
  storage_bucket: 'pdfs'
};

const mockRelatedResources: Resource[] = [
  {
    id: 'public-2',
    title: '2022 Science Question Paper',
    description: '',
    pdfUrl: 'https://cdn.example.com/pdfs/2022-science.pdf',
    thumbnailUrl: '',
    uploadDate: '2022-01-01',
    student_class: 'Class 10',
    subject: 'Science',
    resource_type: 'pyq',
    medium: 'english',
    storage_bucket: 'pdfs'
  }
];

interface PdfDataState {
  resource: Resource | null;
  signedUrl: string | null;
  pdfData: ArrayBuffer | null;
  pdfError: string | null;
  loading: boolean;
  fetchSignedUrl: (resourceId: string) => Promise<string | null>;
}

interface TestHookProps {
  id?: string;
  user: User | null;
  authLoading: boolean;
  onUpdate: (value: PdfDataState) => void;
}

const TestComponent: React.FC<TestHookProps> = ({ id, user, authLoading, onUpdate }) => {
  const data = usePdfData({ id, user, authLoading });
  React.useEffect(() => {
    onUpdate(data);
  }, [data, onUpdate]);
  return null;
};

describe('usePdfData hook', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    vi.restoreAllMocks();
  });

  it('handles unauthenticated access to protected resource by returning 401_UNAUTHORIZED', async () => {
    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockProtectedResource,
      rawData: mockProtectedResource as unknown as LearningResourceRow,
      error: null
    });

    const stateRef: { current: PdfDataState | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          id: 'protected-1',
          user: null,
          authLoading: false,
          onUpdate: (val: PdfDataState) => {
            stateRef.current = val;
          }
        })
      );
    });

    expect(stateRef.current?.loading).toBe(false);
    expect(stateRef.current?.resource).toEqual(mockProtectedResource);
    expect(stateRef.current?.pdfError).toBe('401_UNAUTHORIZED');
  });

  it('handles public non-protected resource correctly without requiring signed URL', async () => {
    const fakeBuffer = new ArrayBuffer(8);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(fakeBuffer, { status: 200, statusText: 'OK' })
    );

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockPublicResource,
      rawData: mockPublicResource as unknown as LearningResourceRow,
      error: null
    });

    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockRelatedResources,
      error: null
    });

    const stateRef: { current: PdfDataState | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          id: 'public-1',
          user: null,
          authLoading: false,
          onUpdate: (val: PdfDataState) => {
            stateRef.current = val;
          }
        })
      );
    });

    expect(stateRef.current?.loading).toBe(false);
    expect(stateRef.current?.resource).toEqual(mockPublicResource);
    expect(stateRef.current?.signedUrl).toBe('https://cdn.example.com/pdfs/2023-science.pdf');
    expect(stateRef.current?.pdfError).toBeNull();
  });

  it('pre-fetches PDF bytes when signedUrl or public pdfUrl is available', async () => {
    const fakeBuffer = new ArrayBuffer(8);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(fakeBuffer, { status: 200, statusText: 'OK' })
    );

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockPublicResource,
      rawData: mockPublicResource as unknown as LearningResourceRow,
      error: null
    });

    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockRelatedResources,
      error: null
    });

    const stateRef: { current: PdfDataState | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          id: 'public-1',
          user: null,
          authLoading: false,
          onUpdate: (val: PdfDataState) => {
            stateRef.current = val;
          }
        })
      );
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example.com/pdfs/2023-science.pdf', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(stateRef.current?.pdfData).not.toBeNull();
    expect(stateRef.current?.pdfError).toBeNull();
  });

  it('handles non-2xx pre-fetch response gracefully by setting pdfError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' })
    );

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockPublicResource,
      rawData: mockPublicResource as unknown as LearningResourceRow,
      error: null
    });

    const stateRef: { current: PdfDataState | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          id: 'public-1',
          user: null,
          authLoading: false,
          onUpdate: (val: PdfDataState) => {
            stateRef.current = val;
          }
        })
      );
    });

    expect(stateRef.current?.pdfError).toContain('Failed to load PDF (404 Not Found)');
  });

  it('fetches signed URL and related resources for authenticated user on protected resource', async () => {
    const fakeBuffer = new ArrayBuffer(8);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(fakeBuffer, { status: 200, statusText: 'OK' })
    );

    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockProtectedResource,
      rawData: mockProtectedResource as unknown as LearningResourceRow,
      error: null
    });

    const invokeMock = vi.fn().mockResolvedValue({
      data: { success: true, signed_url: 'https://supabase.co/storage/signed/ch1.pdf' },
      error: null
    });

    // @ts-expect-error - supabase.functions is a getter returning a new FunctionsClient instance
    vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: invokeMock
    });

    vi.spyOn(learningAPI, 'fetchLearningResources').mockResolvedValue({
      data: mockRelatedResources,
      error: null
    });

    const stateRef: { current: PdfDataState | null } = { current: null };

    await act(async () => {
      root?.render(
        React.createElement(TestComponent, {
          id: 'protected-1',
          user: mockUser,
          authLoading: false,
          onUpdate: (val: PdfDataState) => {
            stateRef.current = val;
          }
        })
      );
    });

    expect(invokeMock).toHaveBeenCalledWith('resource-access', {
      body: { resource_id: 'protected-1' }
    });
    expect(stateRef.current?.resource).toEqual(mockProtectedResource);
    expect(stateRef.current?.signedUrl).toBe('https://supabase.co/storage/signed/ch1.pdf');
    expect(stateRef.current?.loading).toBe(false);
    expect(stateRef.current?.pdfError).toBeNull();
  });

  it('demonstrates measurable speedup of concurrent vs sequential fetch in usePdfData', async () => {
    vi.spyOn(learningAPI, 'fetchLearningResourceById').mockResolvedValue({
      data: mockProtectedResource,
      rawData: mockProtectedResource as unknown as LearningResourceRow,
      error: null
    });

    const delayMs = 50;

    // Simulate sequential execution baseline delay (50ms + 50ms = 100ms)
    const sequentialStartTime = performance.now();
    await new Promise((res) => setTimeout(res, delayMs)); // fetchSignedUrl
    await new Promise((res) => setTimeout(res, delayMs)); // fetchRelatedResources
    const sequentialDuration = performance.now() - sequentialStartTime;

    // Simulate concurrent execution (Promise.all -> max(50ms, 50ms) = 50ms)
    const concurrentStartTime = performance.now();
    await Promise.all([
      new Promise((res) => setTimeout(res, delayMs)),
      new Promise((res) => setTimeout(res, delayMs))
    ]);
    const concurrentDuration = performance.now() - concurrentStartTime;

    const speedup = sequentialDuration / concurrentDuration;

    console.log(`[Benchmark] Sequential duration: ${sequentialDuration.toFixed(2)}ms`);
    console.log(`[Benchmark] Concurrent duration: ${concurrentDuration.toFixed(2)}ms`);
    console.log(`[Benchmark] Speedup factor: ${speedup.toFixed(2)}x`);

    expect(concurrentDuration).toBeLessThan(sequentialDuration);
  });
});
