import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Agentic Discovery Files (llms.txt and ai-catalog.json)', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  const llmsTxtPath = path.join(publicDir, 'llms.txt');
  const aiCatalogPath = path.join(publicDir, 'ai-catalog.json');
  const headersPath = path.join(publicDir, '_headers');

  it('verifies llms.txt exists, starts with H1, and contains valid public links', () => {
    expect(fs.existsSync(llmsTxtPath)).toBe(true);
    const content = fs.readFileSync(llmsTxtPath, 'utf-8').trim();

    // Must start with H1 heading
    expect(content.startsWith('# Horizon')).toBe(true);

    // Must contain required public links
    expect(content).toContain('https://unfollowaman.tech/');
    expect(content).toContain('https://unfollowaman.tech/library/');
    expect(content).toContain('https://unfollowaman.tech/notes/');
    expect(content).toContain('https://unfollowaman.tech/syllabus/');
    expect(content).toContain('https://unfollowaman.tech/about/');
    expect(content).toContain('https://unfollowaman.tech/contact/');
  });

  it('verifies ai-catalog.json exists and parses as valid JSON with expected schema', () => {
    expect(fs.existsSync(aiCatalogPath)).toBe(true);
    const rawContent = fs.readFileSync(aiCatalogPath, 'utf-8');

    let parsed: Record<string, unknown> = {};
    expect(() => {
      parsed = JSON.parse(rawContent);
    }).not.toThrow();

    expect(parsed.name).toBe('Horizon Educational Catalog');
    expect(parsed.url).toBe('https://unfollowaman.tech');
    expect(Array.isArray(parsed.categories)).toBe(true);
    expect((parsed.categories as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.pages)).toBe(true);
    expect((parsed.pages as unknown[]).length).toBeGreaterThan(0);
  });

  it('verifies _headers contains explicit content-type rules for llms.txt and ai-catalog.json', () => {
    expect(fs.existsSync(headersPath)).toBe(true);
    const headersContent = fs.readFileSync(headersPath, 'utf-8');

    expect(headersContent).toContain('/llms.txt');
    expect(headersContent).toContain('Content-Type: text/plain');

    expect(headersContent).toContain('/ai-catalog.json');
    expect(headersContent).toContain('Content-Type: application/json');
  });
});
