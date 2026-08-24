import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import {
  DuplicateReportError,
  REPORT_REASONS,
  submitContentReport,
  type ReportReason,
  type ReportTarget,
} from '../lib/contentReports';
import { trackEvent } from '../lib/analytics';

interface Props {
  target: ReportTarget;
  /** 아이콘만 표시 (카드 모서리 등 좁은 자리) */
  compact?: boolean;
  className?: string;
}

/** 이용자가 올린 내용을 신고한다 — 접수만 하고 판단은 관리자 큐에서 */
export function ReportButton({ target, compact = false, className }: Props) {
  const { t } = useTranslation('planner');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitContentReport({
        target,
        reason,
        detail,
        reporterId: user?.id ?? null,
        locale: normalizeLocale(i18n.language),
      });
      trackEvent('content_report_submit', { targetType: target.type, reason });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof DuplicateReportError
          ? t('report.duplicate')
          : t('report.failed'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [submitting, target, reason, detail, user?.id, t]);

  if (!isSupabaseConfigured) return null;

  const close = () => {
    setOpen(false);
    setDone(false);
    setDetail('');
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        className={`report-trigger ${compact ? 'compact' : ''} ${className ?? ''}`}
        onClick={() => setOpen(true)}
        title={t('report.action')}
        aria-label={t('report.action')}
      >
        <Icon name="flag" size={13} />
        {!compact && <span>{t('report.action')}</span>}
      </button>

      {open && (
        <div
          className="roadview-overlay report-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('report.title')}
          onClick={close}
        >
          <div className="report-panel" onClick={(e) => e.stopPropagation()}>
            <header className="report-header">
              <span className="report-title">
                <Icon name="flag" /> {t('report.title')}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={close}
                aria-label={t('report.close')}
              >
                <Icon name="close" />
              </button>
            </header>

            {done ? (
              <div className="report-body">
                <p className="report-done">{t('report.done')}</p>
                <p className="report-hint">{t('report.doneHint')}</p>
              </div>
            ) : (
              <div className="report-body">
                {target.label && <p className="report-target">{target.label}</p>}
                <fieldset className="report-reasons">
                  <legend>{t('report.reasonLegend')}</legend>
                  {REPORT_REASONS.map((r) => (
                    <label key={r} className="report-reason">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      <span>{t(`report.reasons.${r}`)}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="report-detail-label" htmlFor="report-detail">
                  {t('report.detailLabel')}
                </label>
                <textarea
                  id="report-detail"
                  className="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t('report.detailPlaceholder')}
                />
                {error && <p className="report-error">{error}</p>}
              </div>
            )}

            <footer className="report-footer">
              {done ? (
                <button type="button" className="generate-btn" onClick={close}>
                  {t('report.close')}
                </button>
              ) : (
                <>
                  <button type="button" className="manual-pin-cancel" onClick={close}>
                    {t('report.cancel')}
                  </button>
                  <button
                    type="button"
                    className="generate-btn"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? t('report.submitting') : t('report.submit')}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
