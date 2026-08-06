/** Google Maps — Kakao CustomOverlay와 동일 HTML 마커 */

type LatLngLiteral = { lat: number; lng: number };

export type GoogleHtmlMarkerOptions = {
  onClick?: (e: Event) => void;
  onMouseEnter?: () => void;
  zIndex?: number;
  placeId?: string;
};

export class GoogleHtmlMarker {
  private div: HTMLDivElement | null = null;
  private readonly position: any;
  private readonly overlay: any;
  private selected = false;
  readonly placeId?: string;

  constructor(
    map: any,
    position: LatLngLiteral,
    html: string,
    yAnchor = 1,
    onClickOrOptions?: ((e: Event) => void) | GoogleHtmlMarkerOptions,
    zIndex?: number
  ) {
    const opts: GoogleHtmlMarkerOptions =
      typeof onClickOrOptions === 'function'
        ? { onClick: onClickOrOptions, zIndex }
        : { ...onClickOrOptions, zIndex: onClickOrOptions?.zIndex ?? zIndex };

    this.placeId = opts.placeId;
    const gmaps = window.google.maps;
    this.position = new gmaps.LatLng(position.lat, position.lng);
    this.overlay = new gmaps.OverlayView();

    this.overlay.onAdd = () => {
      this.div = document.createElement('div');
      this.div.style.position = 'absolute';
      this.div.style.cursor = opts.onClick ? 'pointer' : 'default';
      if (opts.zIndex != null) this.div.style.zIndex = String(opts.zIndex);
      if (opts.placeId) this.div.dataset.placeId = opts.placeId;
      this.div.innerHTML = html;
      if (opts.onClick) {
        this.div.addEventListener('click', (e) => {
          e.stopPropagation();
          opts.onClick?.(e);
        });
      }
      if (opts.onMouseEnter) {
        this.div.addEventListener('mouseenter', () => opts.onMouseEnter?.());
      }
      this.applySelected();
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

  private applySelected(): void {
    const marker = this.div?.querySelector('.map-marker');
    marker?.classList.toggle('selected', this.selected);
    if (this.div && this.placeId) {
      this.div.style.zIndex = this.selected ? '1000' : '200';
    }
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.applySelected();
  }

  setMap(map: any | null): void {
    this.overlay.setMap(map);
  }
}
