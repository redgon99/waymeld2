import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import {
  clearAuthCallbackErrorFromUrl,
  formatAuthError,
  readAuthCallbackError,
} from '../lib/authErrors';
import {
  GOOGLE_CLOUD_CONSOLE_CREDENTIALS,
  SUPABASE_AUTH_CALLBACK_URL,
  SUPABASE_DASHBOARD,
} from '../lib/authSetup';
import { normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import { plannerPath } from '../lib/routes';
import '../styles/app.css';

const FEATURES = [
  {
    icon: 'cloudOk' as const,
    title: '클라우드 저장',
    desc: '핀업·동선·자료를 계정에 안전하게 보관합니다',
  },
  {
    icon: 'route' as const,
    title: '여러 기기 동기화',
    desc: 'PC·태블릿·휴대폰에서 이어서 계획하세요',
  },
  {
    icon: 'share' as const,
    title: '공유 링크',
    desc: '완성된 일정을 친구에게 링크로 전달합니다',
  },
];

export default function LoginPage() {
  const { t } = useTranslation('common');
  const locale = normalizeLocale(i18n.language);
  const planPath = plannerPath(locale);
  const navigate = useNavigate();
  const { user, loading, configured, googleAuthEnabled, signInWithEmail, signInWithGoogle, syncLocalTrips } =
    useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  async function copyCallbackUrl() {
    try {
      await navigator.clipboard.writeText(SUPABASE_AUTH_CALLBACK_URL);
      setCopiedCallback(true);
      window.setTimeout(() => setCopiedCallback(false), 2000);
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    const callbackError = readAuthCallbackError();
    if (callbackError) {
      setError(callbackError);
      clearAuthCallbackErrorFromUrl();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setMigrating(true);
      try {
        await syncLocalTrips();
      } finally {
        if (!cancelled) setMigrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, syncLocalTrips]);

  if (!loading && user) {
    return <Navigate to={planPath} replace />;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
    }
  }

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true">
        <div className="login-page-map-grid" />
      </div>

      <div className="login-page-shell">
        <header className="login-page-brand">
          <div className="login-page-logo">
            <Icon name="route" size={28} />
          </div>
          <div>
            <h1>
              {t('appName')}
              {t('appNameEn') && t('appNameEn') !== t('appName') ? (
                <span className="login-page-brand-en"> {t('appNameEn')}</span>
              ) : null}
            </h1>
            <p>{t('appTagline')}</p>
          </div>
        </header>

        <section className="login-page-features" aria-label="주요 기능">
          {FEATURES.map((item) => (
            <article key={item.title} className="login-feature-card">
              <span className="login-feature-icon">
                <Icon name={item.icon} size={20} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="login-page-card surface-float">
          {!configured ? (
            <div className="login-page-unconfigured">
              <Icon name="save" size={22} />
              <h2>로컬 저장 모드</h2>
              <p>
                Supabase 환경 변수가 설정되지 않아 이 기기에만 저장됩니다.
                <br />
                클라우드 동기화를 쓰려면 <code>VITE_SUPABASE_URL</code>과{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>를 설정하세요.
              </p>
              <Link to={planPath} className="login-primary-btn">
                로그인 없이 시작
              </Link>
            </div>
          ) : sent ? (
            <div className="login-page-sent">
              <Icon name="mailOk" size={28} />
              <h2>메일을 확인해 주세요</h2>
              <p>
                <strong>{email}</strong>로 로그인 링크를 보냈습니다.
                <br />
                메일함에서 링크를 누르면 자동으로 로그인됩니다.
              </p>
              <button
                type="button"
                className="login-secondary-btn"
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
              >
                다른 이메일로 받기
              </button>
            </div>
          ) : (
            <>
              <h2>로그인하고 시작하기</h2>
              <p className="login-page-lead">
                이메일로 매직 링크를 보내드립니다. 비밀번호는 필요 없습니다.
              </p>

              <form className="login-form" onSubmit={submit}>
                <label className="login-label" htmlFor="login-email">
                  이메일
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
                <button type="submit" className="login-primary-btn" disabled={sending || loading}>
                  {sending ? '전송 중…' : '매직 링크 받기'}
                </button>
              </form>

              {googleAuthEnabled ? (
                <>
                  <div className="login-divider">
                    <span>또는</span>
                  </div>

                  <button
                    type="button"
                    className="login-oauth-btn"
                    onClick={() => void handleGoogle()}
                  >
                    <Icon name="globe" size={18} />
                    Google로 계속
                  </button>
                </>
              ) : configured ? (
                <details className="login-google-setup">
                  <summary>Google 로그인 설정 안내 (관리자)</summary>
                  <p>
                    Supabase에서 Google Provider가 아직 꺼져 있습니다. 아래 순서로
                    설정한 뒤 <code>VITE_AUTH_GOOGLE_ENABLED=true</code>를 추가하세요.
                  </p>
                  <ol>
                    <li>
                      Google Cloud에서 OAuth 클라이언트 생성 후, 리디렉션 URI에
                      아래 주소를 등록합니다.
                    </li>
                  </ol>
                  <div className="login-callback-row">
                    <code className="login-callback-url">{SUPABASE_AUTH_CALLBACK_URL}</code>
                    <button type="button" className="login-copy-btn" onClick={() => void copyCallbackUrl()}>
                      {copiedCallback ? '복사됨' : '복사'}
                    </button>
                  </div>
                  <ol start={2}>
                    <li>Supabase Google Provider에 Client ID/Secret 입력 후 Enable</li>
                    <li>Redirect URL에 <code>http://localhost:5173/login</code> 추가</li>
                  </ol>
                  <div className="login-setup-links">
                    <a href={GOOGLE_CLOUD_CONSOLE_CREDENTIALS} target="_blank" rel="noreferrer">
                      Google Cloud 콘솔
                    </a>
                    <a href={SUPABASE_DASHBOARD.googleProvider} target="_blank" rel="noreferrer">
                      Supabase Google 설정
                    </a>
                    <a href={SUPABASE_DASHBOARD.urlConfiguration} target="_blank" rel="noreferrer">
                      Supabase Redirect URLs
                    </a>
                  </div>
                </details>
              ) : null}

              {error && <p className="login-error">{error}</p>}
            </>
          )}
        </section>

        <footer className="login-page-footer">
          <button type="button" className="login-guest-link" onClick={() => navigate(planPath)}>
            로그인 없이 시작하기
          </button>
          {migrating && (
            <p className="login-migrating">
              <Icon name="loader" spin size={14} /> 여행 데이터 동기화 중…
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
