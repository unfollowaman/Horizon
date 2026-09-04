import { describe, it, expect, vi } from 'vitest';
import { findFiles, run } from '../seed_pdfs.js';

type StorageItem = { id: string | null; name: string };

interface MockSupabaseClient {
  storage: {
    from: (bucketName: string) => {
      list: (path: string) => Promise<{
        data: StorageItem[] | null;
        error: { message: string } | null;
      }>;
    };
  };
}

function createMockSupabase(tree: Record<string, StorageItem[]>, delayMs = 0): MockSupabaseClient {
  return {
    storage: {
      from: () => ({
        list: async (path: string) => {
          if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          if (path in tree) {
            return { data: tree[path], error: null };
          }
          return { data: null, error: { message: `Directory ${path} not found` } };
        }
      })
    }
  };
}

// Sequential implementation of findFiles for benchmark comparison
async function findFilesSequential(
  supabaseClient: MockSupabaseClient,
  path = ''
): Promise<Array<{ name: string; path: string }>> {
  const { data, error } = await supabaseClient.storage.from('pdfs').list(path);
  if (error || !data) return [];

  const allPDFs: Array<{ name: string; path: string }> = [];
  for (const item of data) {
    if (item.id === null) {
      const nextPath = path ? `${path}/${item.name}` : item.name;
      const subPDFs = await findFilesSequential(supabaseClient, nextPath);
      allPDFs.push(...subPDFs);
    } else if (item.name.endsWith('.pdf')) {
      allPDFs.push({
        name: item.name,
        path: path ? `${path}/${item.name}` : item.name
      });
    }
  }
  return allPDFs;
}

describe('seed_pdfs findFiles', () => {
  it('should recursively collect all PDF files across nested folders', async () => {
    const mockTree: Record<string, StorageItem[]> = {
      '': [
        { id: null, name: 'class-10' },
        { id: null, name: 'class-12' },
        { id: '1', name: 'root-doc.pdf' },
        { id: '2', name: 'readme.txt' }
      ],
      'class-10': [
        { id: null, name: 'math' },
        { id: '3', name: 'class-10-pyq-2022.pdf' }
      ],
      'class-10/math': [
        { id: '4', name: 'algebra.pdf' }
      ],
      'class-12': [
        { id: '5', name: 'physics.pdf' }
      ]
    };

    const mockSupabase = createMockSupabase(mockTree);
    const pdfs = await findFiles(mockSupabase as unknown as Parameters<typeof findFiles>[0], '');

    expect(pdfs).toHaveLength(4);
    expect(pdfs).toEqual(expect.arrayContaining([
      { name: 'root-doc.pdf', path: 'root-doc.pdf' },
      { name: 'class-10-pyq-2022.pdf', path: 'class-10/class-10-pyq-2022.pdf' },
      { name: 'algebra.pdf', path: 'class-10/math/algebra.pdf' },
      { name: 'physics.pdf', path: 'class-12/physics.pdf' }
    ]));
  });

  it('should handle empty directory data or errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockSupabase: MockSupabaseClient = {
      storage: {
        from: () => ({
          list: async () => ({ data: null, error: { message: 'Bucket not found' } })
        })
      }
    };

    const pdfs = await findFiles(mockSupabase as unknown as Parameters<typeof findFiles>[0], '');
    expect(pdfs).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error at', '', expect.objectContaining({ message: 'Bucket not found' }));

    consoleErrorSpy.mockRestore();
  });

  it('should demonstrate measurable performance improvement over sequential traversal', async () => {
    // Generate a deep & wide directory tree with 26 folders total
    // Root -> 5 classes -> 4 subjects per class
    const mockTree: Record<string, StorageItem[]> = {};

    const rootItems: StorageItem[] = [];
    for (let c = 8; c <= 12; c++) {
      const className = `class-${c}`;
      rootItems.push({ id: null, name: className });

      const classItems: StorageItem[] = [];
      const subjects = ['math', 'science', 'english', 'social'];
      for (const subj of subjects) {
        classItems.push({ id: null, name: subj });

        const subjPath = `${className}/${subj}`;
        mockTree[subjPath] = [
          { id: `pdf-${c}-${subj}-1`, name: `chapter1.pdf` },
          { id: `pdf-${c}-${subj}-2`, name: `chapter2.pdf` }
        ];
      }
      mockTree[className] = classItems;
    }
    mockTree[''] = rootItems;

    // Simulate 10ms latency per API call
    const delayMs = 10;
    const mockSupabase = createMockSupabase(mockTree, delayMs);

    const seqStart = performance.now();
    const seqResult = await findFilesSequential(mockSupabase, '');
    const seqDuration = performance.now() - seqStart;

    const concStart = performance.now();
    const concResult = await findFiles(mockSupabase as unknown as Parameters<typeof findFiles>[0], '');
    const concDuration = performance.now() - concStart;

    expect(concResult).toEqual(seqResult);
    expect(concResult).toHaveLength(40); // 5 classes * 4 subjects * 2 PDFs

    console.log(`[Benchmark] Sequential duration: ${seqDuration.toFixed(2)}ms`);
    console.log(`[Benchmark] Concurrent duration: ${concDuration.toFixed(2)}ms`);
    console.log(`[Benchmark] Speedup factor: ${(seqDuration / concDuration).toFixed(2)}x`);

    // Concurrent traversal should be significantly faster than sequential traversal
    expect(concDuration).toBeLessThan(seqDuration / 2);
  });
});

describe('seed_pdfs run execution requirement', () => {
  it('should log an error and exit if SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await run();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required for seed_pdfs.js.'
    );

    consoleErrorSpy.mockRestore();
    if (originalKey !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  });
});
