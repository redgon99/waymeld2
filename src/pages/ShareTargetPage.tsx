import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { useSeoMeta } from '../hooks/useSeoMeta';
import { trackEvent } from '../lib/analytics';
import i18n from '../lib/i18n';
import { extractPlacesFromLink, isLinkPlacesExtractConfigured } from '../lib/linkPlaces';
import type { LinkPlacesExtractResult } from '../lib/linkPlaces';
import { normalizeLocale } from '../lib/locale';
import { plannerPath } from '../lib/routes';
import {
  firstUrlInPayload,
  readSharedPayload,
  saveShareHandoff,
} from '../lib/shareTarget';
import '../styles/app.css';

type Status = 'idle' | 'extracting' | 'done' | 'error';

export default function ShareTargetPage() {
  const { t } = useTranslation('share');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const locale = normalizeLocale(i18n.language);
  const planPath = plannerPath(locale);

  const payload = useMemo(() => readSharedPayload(params), [params]);
  const sharedUrl = useMemo(() => firstUrlInPayload(payload), [payload]);

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<LinkPlacesExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useSeoMeta({ title: t('target.metaTitle'), path: '/share' });

  useEffect(() => {
    if (!sharedUrl) {
      setStatus('error');
      setError(t('target.noLink'));
      return;
    }
    if (!isLinkPlacesExtractConfigured()) {
      setStatus('error');
      setError(t('target.notConfigured'));
      return;
    }

    trackEvent('share_target_receive', { host: safeHost(sharedUrl) });

    let alive = true;
    setStatus('extracting');
    setError(null);

    extractPlacesFromLink(sharedUrl)
      .then((res) => {
        if (!alive) return;
        setResult(res);
        setStatus('done');
        trackEvent('share_target_extract', {
          host: safeHost(sharedUrl),
          places: res.places.length,
          extractable: res.extractable,
        });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : t('target.extractFailed'));
        setStatus('error');
      });

    return () => {
      alive = false;
    };
  }, [sharedUrl, t]);

  const openInPlanner = () => {
    if (result) saveShareHandoff(result);
    navigate(planPath);
  };

  return (
    <div className="static-page share-target-page">
      <header className="static-page-header">
        <Link to={planPath} className="static-page-back">
          <Icon name="chevronLeft" /> {t('target.backToPlan')}
        </Link>
        <h1>{t('target.title')}</h1>
        {sharedUrl && (
          <p className="static-page-lead share-target-source">
            <Icon name="externalLink" size={13} /> {safeHost(sharedUrl)}
          </p>
        )}
      </header>

      {status === 'extracting' && <p className="share-target-status">{t('target.extracting')}</p>}

      {status === 'error' && (
        <div className="share-target-status share-target-error">
          <p>{error}</p>
          <Link to={planPath} className="share-target-cta">
            {t('target.goPlanner')}
          </Link>
        </div>
      )}

      {status === 'done' && result && (
        <div className="share-target-result">
          {result.title && <p className="share-target-title">{result.title}</p>}

          {result.places.length > 0 ? (
            <>
              <p className="share-target-count">
                {t('target.foundPlaces', { count: result.places.length })}
              </p>
              <ul className="share-target-places">
                {result.places.map((place) => (
                  <li key={place.name}>{place.name}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="share-target-status">{result.message || t('target.noPlaces')}</p>
          )}

          <button type="button" className="share-target-cta" onClick={openInPlanner}>
            <Icon name="sparkles" size={14} /> {t('target.openInPlanner')}
          </button>
        </div>
      )}
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
