import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  x: number;
  y: number;
  onSetSearchCenter: () => void;
  onClose: () => void;
}

const CURSOR_OFFSET = 10;
const VIEWPORT_PAD = 8;

export function MapContextMenu({
  open,
  x,
  y,
  onSetSearchCenter,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    if (!open) return;
    const menu = ref.current;
    if (!menu) {
      setPosition({ left: x + CURSOR_OFFSET, top: y + CURSOR_OFFSET });
      return;
    }
    const { width, height } = menu.getBoundingClientRect();
    let left = x + CURSOR_OFFSET;
    let top = y + CURSOR_OFFSET;
    if (left + width > window.innerWidth - VIEWPORT_PAD) {
      left = x - width - CURSOR_OFFSET;
    }
    if (top + height > window.innerHeight - VIEWPORT_PAD) {
      top = y - height - CURSOR_OFFSET;
    }
    setPosition({
      left: Math.max(VIEWPORT_PAD, left),
      top: Math.max(VIEWPORT_PAD, top),
    });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={ref}
      className="map-context-menu"
      style={{ left: position.left, top: position.top }}
      role="menu"
    >
      <button
        type="button"
        className="map-context-menu-btn"
        role="menuitem"
        onClick={() => {
          onSetSearchCenter();
          onClose();
        }}
      >
        <span className="map-context-menu-icon" aria-hidden="true">
          <Icon name="location" size={18} />
        </span>
        <span className="map-context-menu-label">현재 위치를 중심으로</span>
      </button>
    </div>,
    document.body
  );
}
