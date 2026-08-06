import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getOpenStatusBlinkInterval,
  getScheduledStatusBlinkInterval,
  type BusinessOpenStatus,
} from '../lib/openHoursStatus';

type Props = {
  status: BusinessOpenStatus;
  closesAt?: number | null;
  opensAt?: number | null;
  className?: string;
};

export function OpenStatusBadge({
  status,
  closesAt,
  opensAt,
  className = 'result-open-status',
}: Props) {
  const { t } = useTranslation('common');
  const blinkMs = useStatusBlink(status, closesAt, opensAt);
  const label = t(`openStatus.${status}`);

  const blinkClass =
    blinkMs === 1000 ? ' blink-1s' : blinkMs === 3000 ? ' blink-3s' : '';

  return (
    <span className={`${className} is-${status}${blinkClass}`}>
      {label}
    </span>
  );
}

function useStatusBlink(
  status: BusinessOpenStatus,
  closesAt: number | null | undefined,
  opensAt: number | null | undefined
): 1000 | 3000 | null {
  const [blinkMs, setBlinkMs] = useState<1000 | 3000 | null>(null);

  useEffect(() => {
    const targetAt =
      status === 'open'
        ? closesAt
        : status === 'scheduled'
          ? opensAt
          : null;

    if (targetAt == null) {
      setBlinkMs(null);
      return;
    }

    const update = () => {
      const remaining = targetAt - Date.now();
      if (status === 'open') {
        setBlinkMs(getOpenStatusBlinkInterval(remaining));
      } else {
        setBlinkMs(getScheduledStatusBlinkInterval(remaining));
      }
    };

    update();
    const intervalId = window.setInterval(update, 15_000);
    return () => window.clearInterval(intervalId);
  }, [status, closesAt, opensAt]);

  return blinkMs;
}
