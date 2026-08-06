import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import type { PinnedPlace } from '../types';
import {
  type PinImportMode,
  type PinImportResult,
  type PinImportScope,
  parseImportFile,
} from '../lib/importPins';

interface Props {
  currentDay: number;
  totalDays: number;
  pinnedByDay: Record<number, PinnedPlace[]>;
  onImport: (result: PinImportResult) => void;
  onNotify?: (message: string) => void;
  label?: string;
}

type PendingImport = {
  scope: PinImportScope;
  mode: PinImportMode;
};

export function PinImportMenu({
  currentDay,
  totalDays,
  pinnedByDay,
  onImport,
  onNotify,
  label = '읽어오기',
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showAllScope = totalDays > 1;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!pending) return;
    inputRef.current?.click();
  }, [pending]);

  function startImport(scope: PinImportScope, mode: PinImportMode) {
    setPending({ scope, mode });
    setOpen(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const choice = pending;
    setPending(null);
    e.target.value = '';
    if (!file || !choice) return;

    try {
      const content = await file.text();
      const result = parseImportFile(content, file.name, {
        currentDay,
        totalDays,
        existingByDay: pinnedByDay,
        scope: choice.scope,
        mode: choice.mode,
      });
      onImport(result);
      const scopeLabel =
        choice.scope === 'all' ? '전체 일차' : `${currentDay}일차`;
      const modeLabel = choice.mode === 'merge' ? '추가' : '가져오기';
      onNotify?.(`${scopeLabel} ${result.importedCount}곳 ${modeLabel} 완료`);
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : '파일을 읽을 수 없습니다'
      );
    }
  }

  return (
    <div className="pin-import-menu" ref={rootRef}>
      <input
        ref={inputRef}
        type="file"
        className="pin-import-file-input"
        accept=".json,.csv,.txt,application/json,text/csv,text/plain"
        onChange={(e) => void handleFileChange(e)}
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        className={`pin-import-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon name="upload" />
        {label}
      </button>

      {open && (
        <div className="pin-import-dropdown" role="menu">
          <div className="pin-import-section">
            <span className="pin-import-section-label">{currentDay}일차</span>
            <button
              type="button"
              role="menuitem"
              onClick={() => startImport('current', 'replace')}
            >
              가져오기 (덮어쓰기)
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => startImport('current', 'merge')}
            >
              목록에 추가
            </button>
          </div>

          {showAllScope && (
            <div className="pin-import-section">
              <span className="pin-import-section-label">전체 일차</span>
              <button
                type="button"
                role="menuitem"
                onClick={() => startImport('all', 'replace')}
              >
                JSON 전체 적용
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => startImport('all', 'merge')}
              >
                JSON 전체 추가
              </button>
            </div>
          )}

          <p className="pin-import-hint">JSON · CSV · TXT(보내기 형식)</p>
        </div>
      )}
    </div>
  );
}
