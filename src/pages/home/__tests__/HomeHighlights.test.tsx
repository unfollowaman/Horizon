import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Home from '../Home';
import { register } from '../../../services/auth';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('../../../services/auth', () => ({
  register: vi.fn(),
}));

describe('Home HighlightsSection Subscription Form', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    window.matchMedia = window.matchMedia || vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      readonly scrollMargin: string = '';

      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
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
    vi.unstubAllGlobals();
  });

  const fillInput = (input: HTMLInputElement, value: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('renders Subscribe button initially without loading state or aria-busy="true"', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const submitBtn = container?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.getAttribute('aria-busy')).toBe('false');
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.textContent).toContain('Subscribe');
  });

  it('sets aria-busy="true" and displays loading spinner SVG during subscription submit', async () => {
    let resolveRegister!: (value: unknown) => void;
    const registerPromise = new Promise((resolve) => {
      resolveRegister = resolve;
    });

    vi.mocked(register).mockReturnValueOnce(registerPromise as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });

    const nameInput = container?.querySelector('#newsletter-name') as HTMLInputElement;
    const emailInput = container?.querySelector('#newsletter-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#newsletter-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    expect(nameInput).not.toBeNull();
    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(form).not.toBeNull();

    act(() => {
      fillInput(nameInput, 'Test User');
      fillInput(emailInput, 'test@example.com');
      fillInput(passwordInput, 'password123');
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const submitBtn = container?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.getAttribute('aria-busy')).toBe('true');
    expect(submitBtn.disabled).toBe(true);

    const spinner = submitBtn.querySelector('svg.animate-spin');
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(submitBtn.textContent).toContain('Subscribing...');

    await act(async () => {
      resolveRegister({});
    });
  });
});
