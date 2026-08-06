/** Google Maps — Kakao CustomOverlay와 동일 HTML 마커 */

type LatLngLiteral = { lat: number; lng: number };

export class GoogleHtmlMarker {
  private div: HTMLDivElement | null = null;
  private readonly position: any;
  private readonly overlay: any;

  constructor(
    map: any,
    position: LatLngLiteral,
    html: string,
    yAnchor = 1,
    onClick?: (e: Event) => void,
    zIndex?: number
  ) {
    const gmaps = window.google.maps;
    this.position = new gmaps.LatLng(position.lat, position.lng);
    this.overlay = new gmaps.OverlayView();

    this.overlay.onAdd = () => {
      this.div = document.createElement('div');
      this.div.style.position = 'absolute';
      this.div.style.cursor = onClick ? 'pointer' : 'default';
      if (zIndex != null) this.div.style.zIndex = String(zIndex);
      this.div.innerHTML = html;
      if (onClick) {
        this.div.addEventListener('click', (e) => {
          e.stopPropagation();
          onClick(e);
        });
      }
      this.overlay.getPanes()?.overlayMouseTarget.appendChild(this.div);
    };

    this.overlay.draw = () => {
      if (!this.div) return;
      const projection = this.overlay.getProjection();
      const point = projection.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
      this.div.style.transform = `translate(-50%, ${-100 * yAnchor}%)`;
    };

    this.overlay.onRemove = () => {
      this.div?.remove();
      this.div = null;
    };

    this.overlay.setMap(map);
  }

  setMap(map: any | null): void {
    this.overlay.setMap(map);
  }
}
