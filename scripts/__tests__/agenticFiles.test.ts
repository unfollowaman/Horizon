import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Agentic Discovery Files (llms.txt and ai-catalog.json)', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  const llmsTxtPath = path.join(publicDir, 'llms.txt');
  const aiCatalogPath = path.join(publicDir, 'ai-catalog.json');
  const wellKnownAiCatalogPath = path.join(publicDir, '.well-known', 'ai-catalog.json');
  const wellKnownAiPluginPath = path.join(publicDir, '.well-known', 'ai-plugin.json');
  const wellKnownLlmsTxtPath = path.join(publicDir, '.well-known', 'llms.txt');
  const headersPath = path.join(publicDir, '_headers');

  it('verifies llms.txt exists in root and .well-known, starts with H1, and contains valid public links', () => {
    expect(fs.existsSync(llmsTxtPath)).toBe(true);
    expect(fs.existsSync(wellKnownLlmsTxtPath)).toBe(true);

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

  it('verifies ai-catalog.json exists in root and .well-known and parses as valid JSON with expected schema', () => {
    expect(fs.existsSync(aiCatalogPath)).toBe(true);
    expect(fs.existsSync(wellKnownAiCatalogPath)).toBe(true);

    const rawContent = fs.readFileSync(aiCatalogPath, 'utf-8');

    let parsed: Record<string, unknown> = {};
    expect(() => {
      parsed = JSON.parse(rawContent);
    }).not.toThrow();

    expect(parsed.schema_version).toBe('1.0');
    expect(parsed.name).toBe('Horizon Educational Catalog');
    expect(parsed.url).toBe('https://unfollowaman.tech');
    expect(Array.isArray(parsed.categories)).toBe(true);
    expect((parsed.categories as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.pages)).toBe(true);
    expect((parsed.pages as unknown[]).length).toBeGreaterThan(0);
  });

  it('verifies .well-known/ai-plugin.json exists and parses as valid JSON plugin manifest', () => {
    expect(fs.existsSync(wellKnownAiPluginPath)).toBe(true);
    const rawContent = fs.readFileSync(wellKnownAiPluginPath, 'utf-8');

    let parsed: Record<string, unknown> = {};
    expect(() => {
      parsed = JSON.parse(rawContent);
    }).not.toThrow();

    expect(parsed.schema_version).toBe('v1');
    expect(parsed.name_for_human).toBe('Horizon Educational Catalog');
    expect(parsed.name_for_model).toBe('horizon_catalog');
  });

  it('verifies _headers contains explicit content-type rules for all agentic discovery files', () => {
    expect(fs.existsSync(headersPath)).toBe(true);
    const headersContent = fs.readFileSync(headersPath, 'utf-8');

    expect(headersContent).toContain('/llms.txt');
    expect(headersContent).toContain('/.well-known/llms.txt');
    expect(headersContent).toContain('Content-Type: text/plain');

    expect(headersContent).toContain('/ai-catalog.json');
    expect(headersContent).toContain('/.well-known/ai-catalog.json');
    expect(headersContent).toContain('/.well-known/ai-plugin.json');
    expect(headersContent).toContain('Content-Type: application/json');
  });
});
