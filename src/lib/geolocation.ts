export interface GeoCoords {
  lat: number;
  lng: number;
}

/** 브라우저 위치 권한으로 대략적인 현재 좌표를 가져옵니다. */
export function getApproximateLocation(
  options: PositionOptions = { timeout: 5000, maximumAge: 300_000 }
): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      options
    );
  });
}
