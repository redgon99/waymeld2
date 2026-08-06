import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { Place } from '../types';
import { buildPlaceMapLinks } from '../lib/mapLinks';

interface Props {
  place: Place;
  onShowTaxiCard?: () => void;
}

export function PlaceActionBar({ place, onShowTaxiCard }: Props) {
  const { t } = useTranslation('planner');
  const links = buildPlaceMapLinks({
    name: place.nameKo ?? place.name,
    lat: place.lat,
    lng: place.lng,
    address: place.roadAddress || place.address,
  });

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(place.nameKo ?? place.name);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="place-action-bar">
      <button type="button" className="place-action-btn" onClick={() => void copyName()}>
        <Icon name="note" /> {t('place.copyName')}
      </button>
      {onShowTaxiCard && (
        <button type="button" className="place-action-btn primary" onClick={onShowTaxiCard}>
          <Icon name="transportCar" /> {t('taxi.showCard')}
        </button>
      )}
      <a className="place-action-btn" href={links.kakao} target="_blank" rel="noopener noreferrer">
        Kakao
      </a>
      <a className="place-action-btn" href={links.naver} target="_blank" rel="noopener noreferrer">
        Naver
      </a>
      <a className="place-action-btn" href={links.google} target="_blank" rel="noopener noreferrer">
        Google
      </a>
    </div>
  );
}
