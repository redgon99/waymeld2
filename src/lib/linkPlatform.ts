export type LinkPlatform =
  | 'youtube'
  | 'web'
  | 'instagram'
  | 'tiktok'
  | 'unsupported';

export type LinkExtractMode = 'search' | 'extract' | 'sns' | 'invalid';

export interface DetectedLink {
  platform: LinkPlatform;
  /** youtube video id or normalized url */
  sourceKey: string;
  href: string;
  extractable: boolean;
  labelKey: 'youtube' | 'web' | 'instagram' | 'tiktok' | 'unsupported';
}

function tryParseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    try {
      if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return new URL(`https://www.youtube.com/watch?v=${trimmed}`);
      }
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

export function parseYoutubeVideoIdFromHref(href: string): string | null {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
        const id = parts[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    /* ignore */
  }
  const m = href.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m?.[1] ?? null;
}

/** 입력값이 http(s) 링크로 보이면 플랫폼 감지, 아니면 null(일반 검색어) */
export function detectLinkInput(input: string): DetectedLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^www\./i.test(trimmed) ||
    /\.(com|net|org|kr|co\.kr|io|app)([/?#]|$)/i.test(trimmed) ||
    /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ||
    /youtu\.be\//i.test(trimmed) ||
    /youtube\.com/i.test(trimmed);

  if (!looksLikeUrl) return null;

  const url = tryParseUrl(trimmed);
  if (!url || !/^https?:$/i.test(url.protocol)) return null;

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const href = url.toString();

  const ytId = parseYoutubeVideoIdFromHref(href);
  if (ytId || host === 'youtu.be' || host.endsWith('youtube.com')) {
    if (!ytId) {
      return {
        platform: 'unsupported',
        sourceKey: href,
        href,
        extractable: false,
        labelKey: 'unsupported',
      };
    }
    return {
      platform: 'youtube',
      sourceKey: ytId,
      href: `https://www.youtube.com/watch?v=${ytId}`,
      extractable: true,
      labelKey: 'youtube',
    };
  }

  if (
    host === 'instagram.com' ||
    host === 'instagr.am' ||
    host.endsWith('.instagram.com')
  ) {
    return {
      platform: 'instagram',
      sourceKey: href,
      href,
      extractable: false,
      labelKey: 'instagram',
    };
  }

  if (
    host === 'tiktok.com' ||
    host.endsWith('.tiktok.com') ||
    host === 'vm.tiktok.com'
  ) {
    return {
      platform: 'tiktok',
      sourceKey: href,
      href,
      extractable: false,
      labelKey: 'tiktok',
    };
  }

  // 기타 SNS — 자동 추출 없이 원문 안내
  if (
    host === 'facebook.com' ||
    host.endsWith('.facebook.com') ||
    host === 'fb.watch' ||
    host === 'threads.net' ||
    host.endsWith('.threads.net') ||
    host === 'x.com' ||
    host === 'twitter.com' ||
    host === 'linkedin.com' ||
    host.endsWith('.linkedin.com')
  ) {
    return {
      platform: 'unsupported',
      sourceKey: href,
      href,
      extractable: false,
      labelKey: 'unsupported',
    };
  }

  return {
    platform: 'web',
    sourceKey: href,
    href,
    extractable: true,
    labelKey: 'web',
  };
}

export function linkExtractMode(input: string): LinkExtractMode {
  const detected = detectLinkInput(input);
  if (!detected) return 'search';
  if (detected.extractable) return 'extract';
  if (detected.platform === 'instagram' || detected.platform === 'tiktok') return 'sns';
  return 'invalid';
}
