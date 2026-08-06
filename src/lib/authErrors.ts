import type { AuthError } from '@supabase/supabase-js';

/** Supabase 대시보드에서 Google Provider 활성화 후 true */
export const isGoogleAuthEnabled =
  import.meta.env.VITE_AUTH_GOOGLE_ENABLED === 'true';

export function formatAuthError(err: unknown): string {
  const e = err as AuthError & { error_code?: string; msg?: string };
  const code = e.error_code ?? e.code;
  const msg = e.msg ?? e.message ?? '';

  if (
    code === 'validation_failed' &&
    /provider is not enabled|Unsupported provider/i.test(msg)
  ) {
    return 'Google 로그인이 아직 설정되지 않았습니다. 이메일 매직 링크를 이용해 주세요.';
  }
  if (/provider is not enabled|Unsupported provider/i.test(msg)) {
    return 'Google 로그인이 아직 설정되지 않았습니다. 이메일 매직 링크를 이용해 주세요.';
  }
  if (msg) return msg;
  return '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

/** OAuth 콜백 URL의 error 쿼리/해시 파라미터 */
export function readAuthCallbackError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  const desc =
    params.get('error_description') ??
    hashParams.get('error_description') ??
    params.get('error') ??
    hashParams.get('error');
  if (!desc) return null;

  try {
    return formatAuthError({ message: decodeURIComponent(desc.replace(/\+/g, ' ')) });
  } catch {
    return formatAuthError({ message: desc });
  }
}

export function clearAuthCallbackErrorFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('error_code');
  url.hash = '';
  window.history.replaceState({}, '', url.pathname + url.search);
}
