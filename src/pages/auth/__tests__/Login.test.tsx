import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { login } from '../../../services/auth';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../services/auth', () => ({
  login: vi.fn(),
}));

describe('Login Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
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

  const fillInput = (input: HTMLInputElement, value: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('renders login form with all required inputs and register link', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
    });

    const heading = container?.querySelector('h1');
    expect(heading?.textContent).toBe('Login');

    const emailInput = container?.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#login-password') as HTMLInputElement;
    const submitButton = container?.querySelector('button[type="submit"]') as HTMLButtonElement;
    const registerLink = container?.querySelector('a[href="/register"]') as HTMLAnchorElement;

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(submitButton?.textContent).toBe('Login');
    expect(registerLink).not.toBeNull();
    expect(registerLink?.textContent).toBe('Register here');
  });

  it('handles login success and navigates to /dashboard', async () => {
    vi.mocked(login).mockResolvedValueOnce({
      user: { id: 'user-123' },
      session: { access_token: 'token' },
    } as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
    });

    const emailInput = container?.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#login-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(emailInput, 'user@example.com');
      fillInput(passwordInput, 'password123');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(login).toHaveBeenCalledWith('user@example.com', 'password123');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('handles login error and displays error message in role="alert"', async () => {
    const errorMessage = 'Invalid email or password';
    vi.mocked(login).mockRejectedValueOnce(new Error(errorMessage));

    act(() => {
      root?.render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
    });

    const emailInput = container?.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#login-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(emailInput, 'user@example.com');
      fillInput(passwordInput, 'wrongpass');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(login).toHaveBeenCalledWith('user@example.com', 'wrongpass');

    const alert = container?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toBe(errorMessage);
  });

  it('displays fallback error message when error object lacks message property', async () => {
    vi.mocked(login).mockRejectedValueOnce({});

    act(() => {
      root?.render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
    });

    const emailInput = container?.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#login-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(emailInput, 'user@example.com');
      fillInput(passwordInput, 'wrongpass');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const alert = container?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toBe('Failed to login');
  });

  it('shows loading state on submit button while login request is pending', async () => {
    let resolveLogin!: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.mocked(login).mockReturnValueOnce(loginPromise as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );
    });

    const emailInput = container?.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#login-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(emailInput, 'pending@example.com');
      fillInput(passwordInput, 'secret123');
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const submitButton = container?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toBe('Logging in...');

    await act(async () => {
      resolveLogin({ user: { id: '123' } } as never);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
