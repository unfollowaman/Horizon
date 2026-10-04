import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Dropdown from '../Dropdown';

// @ts-expect-error - IS_REACT_ACT_ENVIRONMENT flag suppresses React 19 test warning
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Dropdown component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const options = ['Class 8', 'Class 9', 'Class 10'];

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

  it('renders correctly with default props, title attribute, and high-contrast focus ring', () => {
    act(() => {
      root?.render(<Dropdown value="Class 10" onChange={vi.fn()} options={options} ariaLabel="Filter by class" />);
    });

    const triggerBtn = container?.querySelector('button[aria-label="Filter by class"]');
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn?.getAttribute('title')).toBe('Filter by class');
    expect(triggerBtn?.getAttribute('aria-haspopup')).toBe('listbox');
    expect(triggerBtn?.getAttribute('aria-expanded')).toBe('false');
    expect(triggerBtn?.className).toContain('focus-visible:ring-[#E91E8C]');
    expect(triggerBtn?.textContent).toContain('Class 10');
  });

  it('opens options list when clicked and sets proper ARIA attributes', () => {
    act(() => {
      root?.render(<Dropdown value="Class 10" onChange={vi.fn()} options={options} ariaLabel="Filter by class" />);
    });

    const triggerBtn = container?.querySelector('button[aria-label="Filter by class"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');
    const listbox = container?.querySelector('[role="listbox"][aria-label="Filter by class"]');
    expect(listbox).not.toBeNull();

    const optionElements = container?.querySelectorAll('[role="option"]');
    expect(optionElements?.length).toBe(3);
    expect(optionElements?.[2].getAttribute('aria-selected')).toBe('true');
    expect(optionElements?.[0].getAttribute('aria-selected')).toBe('false');

    // Check checkmark icon on selected option
    const selectedCheckmark = optionElements?.[2].querySelector('svg[aria-hidden="true"]');
    expect(selectedCheckmark).not.toBeNull();
    expect(selectedCheckmark?.getAttribute('class')).toContain('text-[#E91E8C]');

    // Check inset focus ring styling on option
    expect(optionElements?.[2].className).toContain('focus-visible:ring-inset');
  });

  it('dismisses listbox when Escape key is pressed on open trigger button', () => {
    act(() => {
      root?.render(<Dropdown value="Class 10" onChange={vi.fn()} options={options} ariaLabel="Filter by class" />);
    });

    const triggerBtn = container?.querySelector('button[aria-label="Filter by class"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      triggerBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('false');
    expect(container?.querySelector('[role="listbox"]')).toBeNull();
  });

  it('calls onChange when an option is clicked', () => {
    const handleChange = vi.fn();
    act(() => {
      root?.render(<Dropdown value="Class 10" onChange={handleChange} options={options} ariaLabel="Filter by class" />);
    });

    const triggerBtn = container?.querySelector('button[aria-label="Filter by class"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    const optionElements = container?.querySelectorAll('[role="option"]');
    const targetOption = optionElements?.[1] as HTMLButtonElement;
    act(() => {
      targetOption.click();
    });

    expect(handleChange).toHaveBeenCalledWith('Class 9');
  });

  it('opens listbox when ArrowDown key is pressed on trigger button', () => {
    act(() => {
      root?.render(<Dropdown value="Class 10" onChange={vi.fn()} options={options} ariaLabel="Filter by class" />);
    });

    const triggerBtn = container?.querySelector('button[aria-label="Filter by class"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(triggerBtn.getAttribute('aria-expanded')).toBe('true');
    expect(container?.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it('navigates options using Arrow keys and closes on Escape key', () => {
    act(() => {
      root?.render(<Dropdown value="Class 8" onChange={vi.fn()} options={options} ariaLabel="Filter by class" />);
    });

    const triggerBtn = container?.querySelector('button[aria-label="Filter by class"]') as HTMLButtonElement;
    act(() => {
      triggerBtn.click();
    });

    const optionElements = container?.querySelectorAll('[role="option"]');
    const opt0 = optionElements?.[0] as HTMLButtonElement;

    act(() => {
      opt0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    act(() => {
      opt0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container?.querySelector('[role="listbox"]')).toBeNull();
  });
});
