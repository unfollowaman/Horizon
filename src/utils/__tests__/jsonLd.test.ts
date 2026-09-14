import { describe, it, expect } from 'vitest';
import { serializeJsonLd } from '../jsonLd';

describe('serializeJsonLd', () => {
  it('serializes simple objects correctly', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Horizon',
      url: 'https://unfollowaman.tech',
    };
    const serialized = serializeJsonLd(data);
    expect(serialized).toBe(
      '{"@context":"https://schema.org","@type":"Organization","name":"Horizon","url":"https://unfollowaman.tech"}'
    );
  });

  it('escapes HTML special characters to prevent script breakout XSS attacks', () => {
    const malicious = {
      title: '</script><script>alert("XSS")</script>',
      description: 'Test & test < test > test',
    };
    const serialized = serializeJsonLd(malicious);

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).toContain('\\u003c/script\\u003e\\u003cscript\\u003e');
    expect(serialized).toContain('\\u0026');
    expect(serialized).toContain('\\u003c');
    expect(serialized).toContain('\\u003e');
  });

  it('escapes line separators \\u2028 and paragraph separators \\u2029', () => {
    const data = {
      text: 'Line 1\u2028Line 2\u2029Line 3',
    };
    const serialized = serializeJsonLd(data);
    expect(serialized).toContain('\\u2028');
    expect(serialized).toContain('\\u2029');
    expect(serialized).not.toContain('\u2028');
    expect(serialized).not.toContain('\u2029');
  });

  it('supports formatting space parameter', () => {
    const data = { key: 'value' };
    const serialized = serializeJsonLd(data, 2);
    expect(serialized).toBe('{\n  "key": "value"\n}');
  });

  it('maintains 100% JSON.parse round-trip data fidelity', () => {
    const complexData = {
      '@context': 'https://schema.org',
      '@type': 'EducationalResource',
      name: 'Chapter 1: Resource & Development </script>',
      description: 'A study note with <tags> & "quotes".',
      unicode: 'Hindi text: संसाधन एवं विकास',
    };
    const serialized = serializeJsonLd(complexData);
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(complexData);
  });
});
