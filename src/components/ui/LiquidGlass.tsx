import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router-dom';

interface ItemRect {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: string;
}

interface LiquidGlassContextType {
  activeValue: string | null;
  registerItem: (value: string, element: HTMLElement) => void;
  unregisterItem: (value: string) => void;
  onItemClick?: (value: string) => void;
}

const LiquidGlassContext = createContext<LiquidGlassContextType | null>(null);

export interface LiquidGlassGroupProps {
  children: ReactNode;
  value?: string | null;
  onChange?: (value: string) => void;
  className?: string;
  as?: ElementType;
}

export const LiquidGlassGroup = ({
  children,
  value,
  onChange,
  className = '',
  as: Component = 'div',
  ...props
}: LiquidGlassGroupProps & Omit<ComponentPropsWithoutRef<ElementType>, 'onChange'>) => {
  const [internalValue, setInternalValue] = useState<string | null>(value ?? null);
  const activeValue = value !== undefined ? value : internalValue;

  const groupRef = useRef<HTMLElement>(null);
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [activeRect, setActiveRect] = useState<ItemRect | null>(null);

  const registerItem = React.useCallback((val: string, element: HTMLElement) => {
    itemsRef.current.set(val, element);
    updateActiveRect();
  }, []);

  const unregisterItem = React.useCallback((val: string) => {
    itemsRef.current.delete(val);
    updateActiveRect();
  }, []);

  const handleItemClick = React.useCallback((val: string) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
  }, [value, onChange]);

  const updateActiveRect = React.useCallback(() => {
    if (!activeValue || !groupRef.current) {
      setActiveRect((prev) => (prev !== null ? null : prev));
      return;
    }

    const itemElement = itemsRef.current.get(activeValue);
    if (!itemElement) {
      setActiveRect((prev) => (prev !== null ? null : prev));
      return;
    }

    const groupRect = groupRef.current.getBoundingClientRect();
    const itemRect = itemElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(itemElement);

    const newRect = {
      left: itemRect.left - groupRect.left,
      top: itemRect.top - groupRect.top,
      width: itemRect.width,
      height: itemRect.height,
      borderRadius: computedStyle.borderRadius,
    };

    setActiveRect((prev) => {
      if (
        prev &&
        prev.left === newRect.left &&
        prev.top === newRect.top &&
        prev.width === newRect.width &&
        prev.height === newRect.height &&
        prev.borderRadius === newRect.borderRadius
      ) {
        return prev;
      }
      return newRect;
    });
  }, [activeValue]);

  // Re-measure on active value change or window resize
  useEffect(() => {
    updateActiveRect();

    // Use ResizeObserver for more robust size tracking of the group and items
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid ResizeObserver loop limit exceeded error
      requestAnimationFrame(() => updateActiveRect());
    });

    if (groupRef.current) {
      resizeObserver.observe(groupRef.current);
    }

    // Also observe all registered items
    itemsRef.current.forEach(el => resizeObserver.observe(el));

    // Fallback window resize
    window.addEventListener('resize', updateActiveRect);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateActiveRect);
    };
  }, [activeValue]);


  return (
    <LiquidGlassContext.Provider value={{ activeValue, registerItem, unregisterItem, onItemClick: handleItemClick }}>
      <Component ref={groupRef} className={`relative isolate ${className}`} {...props}>
        {activeRect && (
          <div
            className="absolute z-[-1] pointer-events-none liquid-glass-active-layer"
            style={{
              transform: `translate3d(${activeRect.left}px, ${activeRect.top}px, 0)`,
              width: `${activeRect.width}px`,
              height: `${activeRect.height}px`,
              borderRadius: activeRect.borderRadius,
            }}
            aria-hidden="true"
          />
        )}
        {children}
      </Component>
    </LiquidGlassContext.Provider>
  );
};

export interface LiquidGlassItemProps {
  children: ReactNode;
  value: string;
  className?: string;
  to?: string;
  onClick?: () => void;
  as?: ElementType;
}

export const LiquidGlassItem = ({
  children,
  value,
  className = '',
  to,
  onClick,
  as,
  ...props
}: LiquidGlassItemProps & ComponentPropsWithoutRef<ElementType>) => {
  const context = useContext(LiquidGlassContext);
  if (!context) {
    throw new Error('LiquidGlassItem must be used within a LiquidGlassGroup');
  }

  const { activeValue, registerItem, unregisterItem, onItemClick } = context;
  const isActive = activeValue === value;
  const itemRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (itemRef.current) {
      registerItem(value, itemRef.current);
    }
    return () => unregisterItem(value);
  }, [value, registerItem, unregisterItem]);

  const handleClick = (e: React.MouseEvent) => {
    onItemClick?.(value);
    // @ts-ignore
    onClick?.(e);
  };

  const Component = as || (to ? Link : 'button');
  const additionalProps = to ? { to } : {};

  return (
    <Component
      ref={itemRef}
      className={`relative z-10 transition-colors ${className}`}
      onClick={handleClick}
      data-active={isActive}
      {...additionalProps}
      {...props}
    >
      {children}
    </Component>
  );
};
