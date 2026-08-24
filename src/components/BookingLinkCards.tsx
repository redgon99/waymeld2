import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { trackEvent } from '../lib/analytics';
import { extractBookingLinks } from '../lib/bookingLinks';

type Props = {
  note: string | undefined | null;
  /** 어느 장소의 메모인지 — 계측용 */
  placeId: string;
  className?: string;
};

export function BookingLinkCards({ note, placeId, className = '' }: Props) {
  const { t } = useTranslation('planner');
  const links = extractBookingLinks(note);
  if (links.length === 0) return null;

  return (
    <div className={`booking-links ${className}`.trim()}>
      {links.map((link) => (
        <a
          key={link.href}
          className={`booking-link-card provider-${link.provider}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            trackEvent('booking_link_click', { placeId, provider: link.provider, host: link.host });
          }}
        >
          <Icon name="externalLink" size={12} />
          <span className="booking-link-brand">{link.brand}</span>
          <span className="booking-link-action">{t('booking.open')}</span>
        </a>
      ))}
    </div>
  );
}
