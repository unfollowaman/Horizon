import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Register from '../Register';
import { register } from '../../../services/auth';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/auth', () => ({
  register: vi.fn(),
}));

describe('Register Component', () => {
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

  it('renders registration form with all required inputs and login link', () => {
    act(() => {
      root?.render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      );
    });

    const heading = container?.querySelector('h1');
    expect(heading?.textContent).toBe('Register');

    const nameInput = container?.querySelector('#register-name') as HTMLInputElement;
    const emailInput = container?.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#register-password') as HTMLInputElement;
    const submitButton = container?.querySelector('button[type="submit"]') as HTMLButtonElement;
    const loginLink = container?.querySelector('a[href="/login"]') as HTMLAnchorElement;

    expect(nameInput).not.toBeNull();
    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(submitButton?.textContent).toBe('Register');
    expect(loginLink).not.toBeNull();
    expect(loginLink?.textContent).toBe('Login here');
  });

  it('handles registration error and displays error message in role="alert"', async () => {
    const errorMessage = 'This email is already registered. Please sign in instead.';
    vi.mocked(register).mockRejectedValueOnce(new Error(errorMessage));

    act(() => {
      root?.render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      );
    });

    const nameInput = container?.querySelector('#register-name') as HTMLInputElement;
    const emailInput = container?.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#register-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(nameInput, 'John Doe');
      fillInput(emailInput, 'john@example.com');
      fillInput(passwordInput, 'secret123');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(register).toHaveBeenCalledWith('john@example.com', 'secret123', 'John Doe');

    const alert = container?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toBe(errorMessage);
  });

  it('displays fallback error message when error object lacks message property', async () => {
    vi.mocked(register).mockRejectedValueOnce({});

    act(() => {
      root?.render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      );
    });

    const nameInput = container?.querySelector('#register-name') as HTMLInputElement;
    const emailInput = container?.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#register-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(nameInput, 'Jane Doe');
      fillInput(emailInput, 'jane@example.com');
      fillInput(passwordInput, 'secret123');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const alert = container?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toBe('Failed to register');
  });

  it('shows loading state on submit button while registration request is pending', async () => {
    let resolveRegister!: (value: unknown) => void;
    const registerPromise = new Promise((resolve) => {
      resolveRegister = resolve;
    });
    vi.mocked(register).mockReturnValueOnce(registerPromise as never);

    act(() => {
      root?.render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      );
    });

    const nameInput = container?.querySelector('#register-name') as HTMLInputElement;
    const emailInput = container?.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#register-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(nameInput, 'Pending User');
      fillInput(emailInput, 'pending@example.com');
      fillInput(passwordInput, 'secret123');
    });

    act(() => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    const submitButton = container?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toBe('Registering...');

    await act(async () => {
      resolveRegister({ user: { id: '123' } });
    });

    const successHeading = container?.querySelector('h1');
    expect(successHeading?.textContent).toBe('Check your email');
  });

  it('switches to success screen upon successful registration', async () => {
    vi.mocked(register).mockResolvedValueOnce({
      user: { id: 'user-123' },
      session: null,
    });

    act(() => {
      root?.render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      );
    });

    const nameInput = container?.querySelector('#register-name') as HTMLInputElement;
    const emailInput = container?.querySelector('#register-email') as HTMLInputElement;
    const passwordInput = container?.querySelector('#register-password') as HTMLInputElement;
    const form = container?.querySelector('form') as HTMLFormElement;

    act(() => {
      fillInput(nameInput, 'Success User');
      fillInput(emailInput, 'success@example.com');
      fillInput(passwordInput, 'pass12345');
    });

    await act(async () => {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(register).toHaveBeenCalledWith('success@example.com', 'pass12345', 'Success User');

    const successHeading = container?.querySelector('h1');
    expect(successHeading?.textContent).toBe('Check your email');

    const successPara = container?.querySelector('p');
    expect(successPara?.textContent).toContain('We sent a verification link to success@example.com.');
  });
});
