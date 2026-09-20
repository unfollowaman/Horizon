import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PdfTopControls, PdfBottomControls } from '../PdfFloatingControls';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PdfFloatingControls', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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
  });

  describe('PdfTopControls', () => {
    const defaultTopProps = {
      showControls: true,
      onBack: vi.fn(),
      isMobileMenuOpen: false,
      toggleMobileMenu: vi.fn(),
    };

    it('renders top back and mobile menu buttons with ARIA labels and focus-visible styling', () => {
      act(() => {
        root?.render(<PdfTopControls {...defaultTopProps} />);
      });

      const backBtn = container?.querySelector('button[aria-label="Go Back"]');
      const menuBtn = container?.querySelector('button[aria-label="Open menu"]');

      expect(backBtn).not.toBeNull();
      expect(menuBtn).not.toBeNull();

      expect(backBtn?.className).toContain('focus-visible:ring-2');
      expect(backBtn?.className).toContain('focus-visible:ring-ink/20');
      expect(menuBtn?.className).toContain('focus-visible:ring-2');
      expect(menuBtn?.className).toContain('focus-visible:ring-ink/20');
    });

    it('toggles mobile menu button ARIA label when open', () => {
      act(() => {
        root?.render(<PdfTopControls {...defaultTopProps} isMobileMenuOpen={true} />);
      });

      const menuBtn = container?.querySelector('button[aria-label="Close menu"]');
      expect(menuBtn).not.toBeNull();
    });
  });

  describe('PdfBottomControls', () => {
    const defaultBottomProps = {
      showControls: true,
      isThreeDotsMenuOpen: false,
      toggleThreeDotsMenu: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      toggleRotation: vi.fn(),
      handleShare: vi.fn(),
    };

    it('renders bottom control buttons with ARIA attributes and focus-visible styling', () => {
      act(() => {
        root?.render(<PdfBottomControls {...defaultBottomProps} />);
      });

      const zoomInBtn = container?.querySelector('button[aria-label="Zoom In"]');
      const zoomOutBtn = container?.querySelector('button[aria-label="Zoom Out"]');
      const rotateBtn = container?.querySelector('button[aria-label="Rotate Screen"]');
      const shareBtn = container?.querySelector('button[aria-label="Share"]');
      const toggleBtn = container?.querySelector('button[aria-label="More options"]');

      expect(zoomInBtn).not.toBeNull();
      expect(zoomOutBtn).not.toBeNull();
      expect(rotateBtn).not.toBeNull();
      expect(shareBtn).not.toBeNull();
      expect(toggleBtn).not.toBeNull();

      expect(zoomInBtn?.className).toContain('focus-visible:ring-2');
      expect(zoomOutBtn?.className).toContain('focus-visible:ring-2');
      expect(rotateBtn?.className).toContain('focus-visible:ring-2');
      expect(shareBtn?.className).toContain('focus-visible:ring-2');
      expect(toggleBtn?.className).toContain('focus-visible:ring-2');

      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    });

    it('positions Rotate Screen button directly below Zoom Out and directly above Share', () => {
      act(() => {
        root?.render(<PdfBottomControls {...defaultBottomProps} />);
      });

      const allButtons = Array.from(container?.querySelectorAll('button') || []);
      const menuButtons = allButtons.filter(btn => btn.getAttribute('aria-label') !== 'More options');
      const labels = menuButtons.map(btn => btn.getAttribute('aria-label'));

      expect(labels).toEqual(['Zoom In', 'Zoom Out', 'Rotate Screen', 'Share']);
    });

    it('calls toggleRotation when Rotate Screen button is clicked', () => {
      const toggleRotationMock = vi.fn();
      act(() => {
        root?.render(<PdfBottomControls {...defaultBottomProps} toggleRotation={toggleRotationMock} />);
      });

      const rotateBtn = container?.querySelector('button[aria-label="Rotate Screen"]') as HTMLButtonElement;
      expect(rotateBtn).not.toBeNull();

      act(() => {
        rotateBtn.click();
      });

      expect(toggleRotationMock).toHaveBeenCalledTimes(1);
    });

    it('updates aria-expanded attribute when three-dots menu is open', () => {
      act(() => {
        root?.render(<PdfBottomControls {...defaultBottomProps} isThreeDotsMenuOpen={true} />);
      });

      const toggleBtn = container?.querySelector('button[aria-label="More options"]');
      expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
