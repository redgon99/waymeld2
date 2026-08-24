import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import i18n from '../lib/i18n';
import { normalizeLocale } from '../lib/locale';
import { applySeoMeta, type SeoMeta } from '../lib/seo';

/**
 * 페이지별 title/description/OG 메타를 적용한다.
 * meta는 매 렌더 새 객체로 넘어오므로 원시값 단위로 의존성을 건다.
 */
export function useSeoMeta(meta: SeoMeta | null): void {
  const { pathname } = useLocation();
  const language = i18n.language;

  const { title, description, image, type, path } = meta ?? {};

  useEffect(() => {
    if (!title) return;
    applySeoMeta(
      { title, description, image, type, path: path ?? pathname },
      normalizeLocale(language),
    );
  }, [title, description, image, type, path, pathname, language]);
}
