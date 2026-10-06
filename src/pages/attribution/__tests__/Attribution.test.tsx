import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Attribution from '../Attribution';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Attribution Page', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders Attribution & Sourcing heading and subtitle together inside header card', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Attribution />
        </MemoryRouter>
      );
    });

    const header = container?.querySelector('header');
    expect(header).not.toBeNull();

    const h1 = header?.querySelector('h1');
    expect(h1?.textContent).toContain('Attribution & Sourcing');

    const subtitle = header?.querySelector('p');
    expect(subtitle?.textContent).toContain('Horizon is committed to full transparency regarding third-party creative assets');

    const h2s = container?.querySelectorAll('h2');
    expect(h2s?.[0].textContent).toContain('Educational Content Sourcing');
  });

  it('renders inline links for external sources and contact page', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Attribution />
        </MemoryRouter>
      );
    });

    const contactLink = container?.querySelector('a[href="/contact"]');
    expect(contactLink).not.toBeNull();
    expect(contactLink?.textContent).toContain('Contact');

    const rbseLink = container?.querySelector('a[href="https://rajeduboard.rajasthan.gov.in"]');
    expect(rbseLink).not.toBeNull();
  });

  it('renders Storyset attribution links with website-purpose labels and original URLs', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Attribution />
        </MemoryRouter>
      );
    });

    const syllabusLink = container?.querySelector('a[href="https://storyset.com/inspiration"]');
    expect(syllabusLink?.textContent).toContain('Syllabus — Storyset');

    const notesLink = container?.querySelector('a[href="https://storyset.com/people"]');
    expect(notesLink?.textContent).toContain('Notes — Storyset');

    const pyqLinks = container?.querySelectorAll('a[href="https://storyset.com/user"]');
    const hasPyqLabel = Array.from(pyqLinks || []).some((link) =>
      link.textContent?.includes('PYQ Papers — Storyset')
    );
    expect(hasPyqLabel).toBe(true);

    const educationLink = container?.querySelector('a[href="https://storyset.com/education"]');
    expect(educationLink?.textContent).toContain('Class 9 Syllabus — Storyset');

    const peopleLinks = container?.querySelectorAll('a[href="https://storyset.com/people"]');
    const hasClass10Label = Array.from(peopleLinks || []).some((link) =>
      link.textContent?.includes('Class 10 Syllabus, English Syllabus, Sanskrit Syllabus — Storyset')
    );
    expect(hasClass10Label).toBe(true);

    const medicalLink = container?.querySelector('a[href="https://storyset.com/medical"]');
    expect(medicalLink?.textContent).toContain('Science Syllabus — Storyset');

    const workLinks = container?.querySelectorAll('a[href="https://storyset.com/work"]');
    const hasMathLabel = Array.from(workLinks || []).some((link) =>
      link.textContent?.includes('Mathematics Syllabus — Storyset')
    );
    expect(hasMathLabel).toBe(true);

    const homeLink = container?.querySelector('a[href="https://storyset.com/home"]');
    expect(homeLink?.textContent).toContain('Hindi Syllabus — Storyset');

    const natureLink = container?.querySelector('a[href="https://storyset.com/nature"]');
    expect(natureLink?.textContent).toContain('Social Science Syllabus — Storyset');

    const cityLink = container?.querySelector('a[href="https://storyset.com/city"]');
    expect(cityLink?.textContent).toContain('City illustrations — Storyset');

    const hasUserLabel = Array.from(pyqLinks || []).some((link) =>
      link.textContent?.includes('User illustrations — Storyset')
    );
    expect(hasUserLabel).toBe(true);

    const communicationLink = container?.querySelector('a[href="https://storyset.com/communication"]');
    expect(communicationLink?.textContent).toContain('Communication illustrations — Storyset');
  });
});
