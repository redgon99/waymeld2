import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PinnedPlace } from '../types';
import {
  type PinExportFormat,
  type PinExportScope,
  copyPinsToClipboard,
  exportPins,
  getPinGroupsForScope,
  hasExportablePins,
} from '../lib/exportPins';
import { useAuth } from '../contexts/AuthContext';
import { canExportItinerary } from '../lib/subscription';

interface Props {
  tripTitle: string;
  currentDay: number;
  totalDays: number;
  pinnedByDay: Record<number, PinnedPlace[]>;
  onNotify?: (message: string) => void;
  onUpgradeRequest?: () => void;
  label?: string;
}

export function PinExportMenu({
  tripTitle,
  currentDay,
  totalDays,
  pinnedByDay,
  onNotify,
  onUpgradeRequest,
  label,
}: Props) {
  const { t } = useTranslation('planner');
  const { plan, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const exportLabel = label ?? t('export.send');

  const canExport = hasExportablePins(pinnedByDay);
  const showAllScope = totalDays > 1;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!canExport) return null;

  async function runExport(scope: PinExportScope, format: PinExportFormat) {
    if (!canExportItinerary(plan, isAdmin)) {
      onUpgradeRequest?.();
      setOpen(false);
      return;
    }

    const ctx = {
      tripTitle,
      currentDay,
      totalDays,
      pinnedByDay,
      scope,
    };
    if (!getPinGroupsForScope(ctx).length) {
      onNotify?.(t('export.noPins'));
      return;
    }

    if (format === 'text' && scope === 'current') {
      const copied = await copyPinsToClipboard(ctx);
      if (copied) {
        onNotify?.(t('export.copiedDay', { day: currentDay }));
      } else {
        exportPins(ctx, 'text');
        onNotify?.(t('export.savedTextDay', { day: currentDay }));
      }
    } else if (format === 'text' && scope === 'all') {
      const copied = await copyPinsToClipboard(ctx);
      if (copied) {
        onNotify?.(t('export.copiedAll'));
      } else {
        exportPins(ctx, 'text');
        onNotify?.(t('export.savedTextAll'));
      }
    } else {
      exportPins(ctx, format);
      const scopeLabel =
        scope === 'all'
          ? t('export.scopeAll')
          : t('export.scopeDay', { day: currentDay });
      const formatLabel =
        format === 'csv' ? t('export.formatCsv') : t('export.formatJson');
      onNotify?.(t('export.savedFile', { scope: scopeLabel, format: formatLabel }));
    }
    setOpen(false);
  }

  return (
    <div className="pin-export-menu" ref={rootRef}>
      <button
        type="button"
        className={`pin-export-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon name="download" />
        {exportLabel}
      </button>

      {open && (
        <div className="pin-export-dropdown" role="menu">
          <div className="pin-export-section">
            <span className="pin-export-section-label">
              {t('export.scopeDay', { day: currentDay })}
            </span>
            <button type="button" role="menuitem" onClick={() => void runExport('current', 'text')}>
              Text
            </button>
            <button type="button" role="menuitem" onClick={() => runExport('current', 'csv')}>
              CSV
            </button>
            <button type="button" role="menuitem" onClick={() => runExport('current', 'json')}>
              JSON
            </button>
          </div>

          {showAllScope && (
            <div className="pin-export-section">
              <span className="pin-export-section-label">{t('export.scopeAll')}</span>
              <button type="button" role="menuitem" onClick={() => void runExport('all', 'text')}>
                Text
              </button>
              <button type="button" role="menuitem" onClick={() => runExport('all', 'csv')}>
                CSV
              </button>
              <button type="button" role="menuitem" onClick={() => runExport('all', 'json')}>
                JSON
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
