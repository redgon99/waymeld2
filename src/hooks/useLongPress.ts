import { useRef } from 'react';
import type { TouchEvent } from 'react';

interface LongPressOptions {
  delay?: number;
  moveThreshold?: number;
}

/**
 * 지도 팬(드래그)과 구분하기 위해 이동거리 임계치를 넘으면 타이머를 취소한다.
 * 좌표 변환은 하지 않는다 — 길게 누르면 "픽 모드 진입" 같은 순수 제스처 신호만 낸다.
 */
export function useLongPress(onLongPress: () => void, options?: LongPressOptions) {
  const delay = options?.delay ?? 550;
  const moveThreshold = options?.moveThreshold ?? 12;
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  };

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startRef.current = { x: touch.clientX, y: touch.clientY };
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onLongPress();
    }, delay);
  };

  const onTouchMove = (e: TouchEvent) => {
    const start = startRef.current;
    const touch = e.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.hypot(dx, dy) > moveThreshold) clear();
  };

  const onTouchEnd = () => clear();
  const onTouchCancel = () => clear();

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
