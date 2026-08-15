import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { LocaleSwitcher } from '../components/LocaleSwitcher';
import { normalizeLocale, pathWithLocale } from '../lib/locale';
import { plannerPath } from '../lib/routes';
import i18n from '../lib/i18n';
import { isGuidesConfigured, listPublishedGuides } from '../lib/guides';
import type { GuideArticle } from '../types/guides';
import '../styles/landing.css';

function LandingBrand({ className = '' }: { className?: string }) {
  const { t } = useTranslation('landing');
  const secondary = t('brand.secondary');
  return (
    <span className={`landing-brand-text ${className}`.trim()}>
      <span className="landing-brand-primary">{t('brand.primary')}</span>
      {secondary ? <span className="landing-brand-sub">{secondary}</span> : null}
    </span>
  );
}

const GALLERY = [
  { src: '/landing/hero.png', alt: 'WayMeld map' },
  { src: '/landing/screen-search.png', alt: 'Search' },
  { src: '/landing/screen-route.png', alt: 'Route' },
];

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const { t: tg } = useTranslation('guides');
  const locale = normalizeLocale(i18n.language);
  const planPath = plannerPath(locale);
  const plazaPath = pathWithLocale('/plaza', locale);
  const guidesPath = pathWithLocale('/guides', locale);
  const infoPath = pathWithLocale('/info', locale);
  const loginPath = pathWithLocale('/login', locale);
  const year = new Date().getFullYear();
  const [tipGuides, setTipGuides] = useState<GuideArticle[]>([]);

  useEffect(() => {
    document.title = t('meta.title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta.description'));
  }, [t]);

  useEffect(() => {
    if (!isGuidesConfigured()) return;
    let alive = true;
    void listPublishedGuides(6)
      .then((rows) => {
        if (alive) setTipGuides(rows);
      })
      .catch(() => {
        /* optional teaser */
      });
    return () => {
      alive = false;
    };
  }, []);

  const compareRows = [
    t('compare.row1', { returnObjects: true }) as string[],
    t('compare.row2', { returnObjects: true }) as string[],
    t('compare.row3', { returnObjects: true }) as string[],
  ];

  const steps = ['step1', 'step2', 'step3', 'step4'] as const;

  return (
    <div className="landing-page">
      <div className="landing-top">
        <p className="landing-notice" role="status">
          {t('notice.trial')}
        </p>
      <header className="landing-nav">
        <Link to={pathWithLocale('/', locale)} className="landing-brand">
          <span className="landing-brand-mark" aria-hidden>
            <Icon name="pin" size={20} />
          </span>
          <LandingBrand />
        </Link>
        <nav className="landing-nav-links" aria-label="Main">
          <a href="#features">{t('nav.features')}</a>
          <a href="#how">{t('nav.howItWorks')}</a>
          <Link to={plazaPath}>{t('nav.plaza')}</Link>
          <Link to={guidesPath}>{t('nav.tips')}</Link>
          <Link to={infoPath}>{t('nav.info')}</Link>
        </nav>
        <div className="landing-nav-actions">
          <LocaleSwitcher compact />
          <Link to={loginPath} className="landing-btn landing-btn-secondary">
            {t('nav.login')}
          </Link>
          <Link to={planPath} className="landing-btn landing-btn-primary">
            {t('nav.start')}
          </Link>
        </div>
      </header>
      </div>

      <section className="landing-section landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="landing-hero-lead">{t('hero.subtitle')}</p>
          <div className="landing-hero-ctas">
            <Link to={planPath} className="landing-btn landing-btn-primary">
              {t('hero.ctaPrimary')}
            </Link>
            <Link to={plazaPath} className="landing-btn landing-btn-secondary">
              {t('hero.ctaSecondary')}
            </Link>
          </div>
          <p className="landing-hero-note">{t('hero.note')}</p>
        </div>
        <div className="landing-hero-visual">
          <div className="landing-phone">
            <div className="landing-phone-glow" aria-hidden />
            <div className="landing-phone-screen">
              <img src="/landing/hero.png" alt="" width={280} height={560} />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features" aria-labelledby="pillars-title">
        <div className="landing-section-header">
          <h2 id="pillars-title">{t('pillars.title')}</h2>
        </div>
        <div className="landing-pillars">
          <article className="landing-pillar-card">
            <div className="landing-pillar-icon">
              <Icon name="search" size={24} />
            </div>
            <h3>{t('pillars.search.title')}</h3>
            <p>{t('pillars.search.body')}</p>
          </article>
          <article className="landing-pillar-card">
            <div className="landing-pillar-icon">
              <Icon name="route" size={24} />
            </div>
            <h3>{t('pillars.route.title')}</h3>
            <p>{t('pillars.route.body')}</p>
          </article>
          <article className="landing-pillar-card">
            <div className="landing-pillar-icon">
              <Icon name="share" size={24} />
            </div>
            <h3>{t('pillars.share.title')}</h3>
            <p>{t('pillars.share.body')}</p>
          </article>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="features-title">
        <div className="landing-section-header">
          <h2 id="features-title">{t('features.title')}</h2>
          <p>{t('features.subtitle')}</p>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <h3>{t('features.multiDay.title')}</h3>
            <p>{t('features.multiDay.body')}</p>
          </article>
          <article className="landing-feature-card">
            <h3>{t('features.category.title')}</h3>
            <p>{t('features.category.body')}</p>
          </article>
          <article className="landing-feature-card">
            <h3>{t('features.maps.title')}</h3>
            <p>{t('features.maps.body')}</p>
          </article>
          <article className="landing-feature-card">
            <h3>{t('features.presentation.title')}</h3>
            <p>{t('features.presentation.body')}</p>
          </article>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="compare-title">
        <div className="landing-section-header">
          <h2 id="compare-title">{t('compare.title')}</h2>
        </div>
        <div className="landing-compare">
          <table>
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col" className="col-us">
                  {t('compare.us')}
                </th>
                <th scope="col">{t('compare.them')}</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, i) => (
                <tr key={i}>
                  <td />
                  <td className="col-us">{row[0]}</td>
                  <td>{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="landing-section" id="how" aria-labelledby="steps-title">
        <div className="landing-section-header">
          <h2 id="steps-title">{t('steps.title')}</h2>
        </div>
        <div className="landing-steps">
          {steps.map((key, i) => (
            <div key={key} className="landing-step">
              <span className="landing-step-num">{i + 1}</span>
              <div>
                <h3>{t(`steps.${key}.title`)}</h3>
                <p>{t(`steps.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="tips-title">
        <div className="landing-section-header landing-tips-header">
          <div>
            <h2 id="tips-title">{t('tips.title')}</h2>
            <p>{t('tips.subtitle')}</p>
          </div>
          <Link to={guidesPath} className="landing-tips-more">
            {t('tips.more')} →
          </Link>
        </div>
        {tipGuides.length === 0 ? (
          <p className="landing-tips-empty">{t('tips.empty')}</p>
        ) : (
          <div className="landing-tips-grid">
            {tipGuides.map((g) => (
              <Link
                key={g.id}
                to={pathWithLocale(`/guides/${g.slug}`, locale)}
                className="landing-tip-card"
              >
                <span className="landing-tip-kind">{tg(`kinds.${g.kind}`)}</span>
                <h3>{g.title}</h3>
                <p>{g.summary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="landing-section" aria-labelledby="gallery-title">
        <div className="landing-section-header">
          <h2 id="gallery-title">{t('gallery.title')}</h2>
        </div>
        <div className="landing-gallery">
          {GALLERY.map((item) => (
            <div key={item.src} className="landing-gallery-item">
              <img src={item.src} alt={item.alt} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-band" aria-labelledby="cta-title">
        <h2 id="cta-title">{t('cta.title')}</h2>
        <p>{t('cta.subtitle')}</p>
        <Link to={planPath} className="landing-btn landing-btn-primary landing-btn-accent">
          {t('cta.button')}
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-brand">
            <span className="landing-brand-mark" aria-hidden>
              <Icon name="pin" size={18} />
            </span>
            <LandingBrand />
          </div>
          <p className="landing-footer-copy">{t('footer.tagline')}</p>
          <nav className="landing-footer-links">
            <Link to={planPath}>{t('footer.plan')}</Link>
            <Link to={plazaPath}>{t('footer.plaza')}</Link>
            <Link to={guidesPath}>{t('footer.tips')}</Link>
            <Link to={infoPath}>{t('footer.info')}</Link>
            <Link to={loginPath}>{t('footer.login')}</Link>
          </nav>
          <p className="landing-footer-copy">{t('footer.rights', { year })}</p>
        </div>
      </footer>
    </div>
  );
}
