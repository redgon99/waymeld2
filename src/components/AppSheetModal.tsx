import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function AppSheetModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="app-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`app-sheet-modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="app-sheet-header">
          <div className="app-sheet-heading">
            <h2 id="app-sheet-title">{title}</h2>
            {subtitle ? <p className="app-sheet-sub">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="app-sheet-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="app-sheet-body">{children}</div>
      </div>
    </div>
  );
}
