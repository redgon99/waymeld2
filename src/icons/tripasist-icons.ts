/**
 * Tripasist 아이콘 세트 — 여행·지도·핀·동선·자료함 UI용
 * 24×24, stroke 1.75, currentColor (앱 accent·텍스트와 조화)
 */

export type IconName =
  | 'search'
  | 'close'
  | 'help'
  | 'layoutGrid'
  | 'layoutList'
  | 'refresh'
  | 'location'
  | 'star'
  | 'roadview'
  | 'check'
  | 'pin'
  | 'mapPin'
  | 'pinPlus'
  | 'pinSelect'
  | 'route'
  | 'navigate'
  | 'share'
  | 'save'
  | 'upload'
  | 'download'
  | 'install'
  | 'loader'
  | 'folder'
  | 'note'
  | 'photo'
  | 'attach'
  | 'file'
  | 'trash'
  | 'plus'
  | 'grip'
  | 'flag'
  | 'target'
  | 'crosshair'
  | 'cloud'
  | 'cloudOk'
  | 'mailOk'
  | 'clock'
  | 'phone'
  | 'globe'
  | 'bell'
  | 'trophy'
  | 'sparkles'
  | 'wand'
  | 'zoomIn'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'externalLink'
  | 'calendar'
  | 'message'
  | 'presentation'
  | 'minimize'
  | 'catTour'
  | 'catFood'
  | 'catCafe'
  | 'catStay'
  | 'catCulture'
  | 'catShop'
  | 'catCart'
  | 'catParking'
  | 'catAll'
  | 'transportCar'
  | 'transportWalk'
  | 'transportBus'
  | 'transportBike'
  | 'facilityGroup'
  | 'facilityBabyChair'
  | 'facilityKidsMenu'
  | 'facilityTerrace'
  | 'facilityTakeout'
  | 'facilityPet'
  | 'facilityRestroom'
  | 'facilityBarTable'
  | 'facilityBreakfast'
  | 'facilityReservation'
  | 'facilityPayment'
  | 'facilityWifi'
  | 'facilitySmoking'
  | 'facilityInfo';

export interface IconPath {
  d: string;
  /** true면 면 채움 (별점 등) */
  fill?: boolean;
}

export const TRIPASIST_ICONS: Record<IconName, IconPath[]> = {
  search: [
    { d: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z' },
    { d: 'M16.5 16.5 5 21' },
  ],
  close: [{ d: 'M6 6l12 12M18 6 6 18' }],
  help: [
    { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z' },
    { d: 'M9.5 9.25a2.75 2.75 0 1 1 4.6 1.1c-.9.9-2.1 1.15-2.1 2.65' },
    { d: 'M12 17.25v.5' },
  ],
  layoutGrid: [
    { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  ],
  layoutList: [
    { d: 'M5 7h14M5 12h14M5 17h14' },
  ],
  refresh: [
    { d: 'M20 12a8 8 0 1 1-2.3-5.7' },
    { d: 'M20 4v5h-5' },
  ],
  location: [
    { d: 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
    { d: 'M12 21V13M12 3v2M21 12h-2M5 12H3M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4l-1.4-1.4M7 7 5.6 5.6' },
  ],
  star: [
    {
      d: 'M12 3.5l2.35 4.76 5.25.77-3.8 3.7.9 5.24L12 15.9l-4.7 2.47.9-5.24-3.8-3.7 5.25-.77L12 3.5z',
      fill: true,
    },
  ],
  roadview: [
    { d: 'M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z' },
    { d: 'M9 10h6M12 7v6' },
    { d: 'M8 16l2-2M16 16l-2-2' },
  ],
  check: [{ d: 'M5 12.5 9.5 17 19 7' }],
  pin: [
    { d: 'M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z' },
    { d: 'M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  ],
  mapPin: [{ d: 'M12 21V11M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' }],
  pinPlus: [
    { d: 'M12 21s-5.5-4.6-5.5-9.2a5.5 5.5 0 1 1 11 0C17.5 16.4 12 21 12 21z' },
    { d: 'M12 8.5v5M9.5 11h5' },
  ],
  pinSelect: [
    { d: 'M12 21V12.5' },
    { d: 'M8.5 12.5 12 9l3.5 3.5' },
    { d: 'M5 5h2M17 5h2M5 19h2M19 19h2' },
  ],
  route: [
    { d: 'M5 7.5h4l2 3 4-6 4 5.5' },
    { d: 'M5 7.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { d: 'M19 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  ],
  navigate: [
    { d: 'M12 3l7 7-7 4-4 4 1-8 3-3z' },
    { d: 'M12 3v8' },
  ],
  share: [
    { d: 'M14 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0z' },
    { d: 'M6 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0z' },
    { d: 'M14 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0z' },
    { d: 'M10 6.5 8 10.5M10 17.5 8 13.5M14 6.5 16 10.5M14 17.5 16 13.5' },
  ],
  save: [
    { d: 'M5 5h12l2 2v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5z' },
    { d: 'M9 5h6v5H9V5z' },
  ],
  upload: [
    { d: 'M12 14V4M8 8l4-4 4 4' },
    { d: 'M5 20h14' },
  ],
  download: [
    { d: 'M12 4v10M8 10l4 4 4-4' },
    { d: 'M5 20h14' },
  ],
  install: [
    { d: 'M12 3v12M8 9l4-4 4 4' },
    { d: 'M5 21h14' },
    { d: 'M8 17h8' },
  ],
  loader: [{ d: 'M12 3a9 9 0 1 0 9 9' }],
  folder: [
    { d: 'M4 7h6l2 2h8v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z' },
    { d: 'M4 7v2h16' },
  ],
  note: [
    { d: 'M7 4h10a1 1 0 0 1 1 1v14l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z' },
    { d: 'M9 9h6M9 12h4' },
  ],
  photo: [
    { d: 'M5 6h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z' },
    { d: 'M8.5 13.5 10.5 11l2.5 3 2-2.5L18 16H6l2.5-2.5z' },
    { d: 'M9 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  ],
  attach: [
    {
      d: 'M8.5 13.5a4.5 4.5 0 0 0 6.4 0l4.6-4.6a3 3 0 0 0-4.2-4.2L10.3 9.9a1.5 1.5 0 0 0 2.1 2.1l5.1-5.1',
    },
  ],
  file: [
    { d: 'M8 4h8l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z' },
    { d: 'M14 4v4h4' },
  ],
  trash: [
    { d: 'M5 7h14M9 7V5h6v2M10 11v5M14 11v5' },
    { d: 'M7 7l1 12h8l1-12' },
  ],
  plus: [{ d: 'M12 6v12M6 12h12' }],
  grip: [
    { d: 'M9 6v.01M9 12v.01M9 18v.01M15 6v.01M15 12v.01M15 18v.01' },
  ],
  flag: [
    { d: 'M6 4v16' },
    { d: 'M6 4h10l-2 3 2 3H6' },
  ],
  target: [
    { d: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { d: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4' },
  ],
  crosshair: [
    { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z' },
    { d: 'M12 3v4M12 17v4M3 12h4M17 12h4' },
  ],
  cloud: [{ d: 'M7 18h11a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6-1.8A3.5 3.5 0 0 0 7 18z' }],
  cloudOk: [
    { d: 'M7 17h11a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5-1.7A3.5 3.5 0 0 0 7 17z' },
    { d: 'M9 14l2 2 4-4' },
  ],
  mailOk: [
    { d: 'M4 7h16v10H4V7z' },
    { d: 'M4 7l8 6 8-6' },
    { d: 'M16 14l2 2' },
  ],
  clock: [
    { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z' },
    { d: 'M12 7v5l3 2' },
  ],
  phone: [{ d: 'M8 3h8l2 3v12l-2 3H8l-2-3V6l2-3zM11 17h2' }],
  globe: [
    { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z' },
    { d: 'M3 12h18M12 3c2.5 2.8 4 6.2 4 9s-1.5 6.2-4 9M12 3c-2.5 2.8-4 6.2-4 9s1.5 6.2 4 9' },
  ],
  bell: [
    { d: 'M12 5a4 4 0 0 1 4 4v3l2 3H6l2-3V9a4 4 0 0 1 4-4z' },
    { d: 'M10 18a2 2 0 0 0 4 0' },
  ],
  trophy: [
    { d: 'M8 5h8v5a4 4 0 0 1-8 0V5z' },
    { d: 'M10 18h4M12 14v4M7 5H5a2 2 0 0 0 2 2M17 5h2a2 2 0 0 1-2 2' },
  ],
  sparkles: [
    { d: 'M12 3l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z' },
    { d: 'M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z' },
    { d: 'M19 8l.5 1.5L21 10l-1.5.5L19 12l-.5-1.5L17 10l1.5-.5L19 8z' },
  ],
  wand: [
    { d: 'M14 4l6 6M8 20l8-8' },
    { d: 'M5 5l2 2M3 9h3M9 3V6' },
  ],
  zoomIn: [
    { d: 'M10 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12z' },
    { d: 'M14 14l6 6M10 8v4M8 10h4' },
  ],
  chevronLeft: [{ d: 'M14 6l-6 6 6 6' }],
  chevronRight: [{ d: 'M10 6l6 6-6 6' }],
  chevronDown: [{ d: 'M6 9l6 6 6-6' }],
  externalLink: [
    { d: 'M12 5h7v7M19 5l-8 8M5 10v9h9' },
  ],
  calendar: [
    { d: 'M6 5h12v16H6V5z' },
    { d: 'M8 3v4M16 3v4M6 10h12' },
    { d: 'M9 14h2M13 14h2' },
  ],
  message: [
    { d: 'M5 6h14a1 1 0 0 1 1 1v9l-4-3-4 3-4-3-4 3V7a1 1 0 0 1 1-1z' },
    { d: 'M8 10h8M8 13h5' },
  ],
  presentation: [
    { d: 'M4 6h16v10H4V6z' },
    { d: 'M8 18h8' },
  ],
  minimize: [
    { d: 'M8 4v6H4M16 20v-6h4' },
    { d: 'M4 4l6 6M20 20l-6-6' },
  ],
  catTour: [
    { d: 'M12 21V11' },
    { d: 'M8 11l4-6 4 6' },
    { d: 'M6 21h12' },
  ],
  catFood: [
    { d: 'M6 4v8a3 3 0 0 0 6 0V4' },
    { d: 'M12 4v8a3 3 0 0 0 6 0' },
    { d: 'M6 12v2M18 12v2' },
  ],
  catCafe: [
    { d: 'M5 9h11v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9z' },
    { d: 'M7 5c0-1 1-2 2-2h6c1 0 2 1 2 2' },
    { d: 'M18 10h2v2a2 2 0 0 1-2 2h-1' },
  ],
  catStay: [
    { d: 'M4 12h16v8H4v-8z' },
    { d: 'M6 12V8a6 6 0 0 1 12 0v4' },
  ],
  catCulture: [
    { d: 'M6 20V8l6-4 6 4v12' },
    { d: 'M10 20v-6h4v6' },
    { d: 'M9 12h6' },
  ],
  catShop: [
    { d: 'M7 8h10l-1 11H8L7 8z' },
    { d: 'M10 8V6a2 2 0 0 1 4 0v2' },
  ],
  catCart: [
    { d: 'M6 6h14l-1.5 9H8L6 6z' },
    { d: 'M10 18a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM16 18a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  ],
  catParking: [
    { d: 'M6 4h12v16H6V4z' },
    { d: 'M10 8h2a2 2 0 1 1 0 4h-2V8z' },
  ],
  catAll: [
    { d: 'M5 5h6v6H5V5zM13 5h6v6h-6V5zM5 13h6v6H5v-6zM13 13h6v6h-6v-6z' },
  ],
  transportCar: [
    { d: 'M5 11h14l-1.5 6H6.5L5 11z' },
    { d: 'M7 8h10l1 3H6l1-3z' },
    { d: 'M8 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM16 17a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  ],
  transportWalk: [
    { d: 'M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { d: 'M10 21l2-7 2 7M9 12h6l-1 4' },
  ],
  transportBus: [
    { d: 'M6 6h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z' },
    { d: 'M8 18a1 1 0 0 0 2 0M14 18a1 1 0 0 0 2 0M6 10h12' },
  ],
  transportBike: [
    { d: 'M6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { d: 'M8 16l4-8 3 4h3' },
  ],
  facilityGroup: [
    { d: 'M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { d: 'M6 11v6M12 10v7M18 11v6' },
  ],
  facilityBabyChair: [
    { d: 'M8 6h8v12H8V6z' },
    { d: 'M10 6V4a2 2 0 0 1 4 0v2' },
    { d: 'M9 14h6' },
  ],
  facilityKidsMenu: [
    { d: 'M7 5h10v14H7V5z' },
    { d: 'M9 9h6M9 13h4' },
    { d: 'M10 16a1 1 0 0 0 2 0' },
  ],
  facilityTerrace: [
    { d: 'M12 4v3M8 7h8' },
    { d: 'M6 20h12M8 20v-5h8v5' },
    { d: 'M10 15h4' },
  ],
  facilityTakeout: [
    { d: 'M8 8h8l-1 10H9L8 8z' },
    { d: 'M10 8V6h4v2' },
    { d: 'M9 12h6' },
  ],
  facilityPet: [
    { d: 'M9 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
    { d: 'M7 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
    { d: 'M12 13v5M10 18h4' },
  ],
  facilityRestroom: [
    { d: 'M6 5h12v14H6V5z' },
    { d: 'M9 9h2v6M13 9h2v6M10 5h4' },
  ],
  facilityBarTable: [
    { d: 'M6 18h12M12 6v12' },
    { d: 'M8 6h8' },
  ],
  facilityBreakfast: [
    { d: 'M12 4v2M5 12a7 7 0 1 1 14 0' },
    { d: 'M8 18h8l-1 3H9l-1-3z' },
  ],
  facilityReservation: [
    { d: 'M6 5h12v16H6V5z' },
    { d: 'M8 3v4M16 3v4M6 10h12M9 14l2 2 4-4' },
  ],
  facilityPayment: [
    { d: 'M4 8h16v10H4V8z' },
    { d: 'M4 11h16M8 15h4' },
  ],
  facilityWifi: [
    { d: 'M5 10.5a11 11 0 0 1 14 0M8 14a6 6 0 0 1 8 0M12 18v2' },
  ],
  facilitySmoking: [
    { d: 'M9 16h6M12 6v6M15 6c2 1 2 3 0 4' },
  ],
  facilityInfo: [
    { d: 'M12 17v-4M12 9h.01' },
    { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
  ],
};

/** Tabler 클래스명 → Tripasist 아이콘 (마이그레이션·문서용) */
export const TABLER_TO_TRIPASIST: Record<string, IconName> = {
  'ti-search': 'search',
  'ti-x': 'close',
  'ti-refresh': 'refresh',
  'ti-current-location': 'location',
  'ti-star-filled': 'star',
  'ti-view-360': 'roadview',
  'ti-check': 'check',
  'ti-pin': 'pin',
  'ti-map-pin': 'mapPin',
  'ti-map-pin-plus': 'pinPlus',
  'ti-map-pin-pin': 'pinSelect',
  'ti-route': 'route',
  'ti-navigation': 'navigate',
  'ti-share': 'share',
  'ti-device-floppy': 'save',
  'ti-upload': 'upload',
  'ti-download': 'download',
  'ti-loader-2': 'loader',
  'ti-folder': 'folder',
  'ti-note': 'note',
  'ti-photo': 'photo',
  'ti-paperclip': 'attach',
  'ti-file': 'file',
  'ti-trash': 'trash',
  'ti-plus': 'plus',
  'ti-grip-vertical': 'grip',
  'ti-flag-3': 'flag',
  'ti-target': 'target',
  'ti-cloud': 'cloud',
  'ti-cloud-check': 'cloudOk',
  'ti-mail-check': 'mailOk',
  'ti-clock': 'clock',
  'ti-phone': 'phone',
  'ti-world': 'globe',
  'ti-bell': 'bell',
  'ti-trophy': 'trophy',
  'ti-sparkles': 'sparkles',
  'ti-wand': 'wand',
  'ti-zoom-in': 'zoomIn',
  'ti-chevron-left': 'chevronLeft',
  'ti-chevron-right': 'chevronRight',
  'ti-chevron-down': 'chevronDown',
  'ti-external-link': 'externalLink',
};

export function iconSvgMarkup(
  name: IconName,
  options?: { size?: number; className?: string; color?: string }
): string {
  const size = options?.size ?? 20;
  const cls = options?.className ? ` class="${options.className} ta-icon"` : ' class="ta-icon"';
  const style = options?.color ? ` style="color:${options.color}"` : '';
  const paths = TRIPASIST_ICONS[name]
    .map((p) =>
      p.fill
        ? `<path fill="currentColor" stroke="none" d="${p.d}"/>`
        : `<path d="${p.d}"/>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${cls}${style} aria-hidden="true">${paths}</svg>`;
}
