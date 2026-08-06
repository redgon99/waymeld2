import i18n from './i18n';
import type { PinnedPlace } from '../types';

export type PinExportScope = 'current' | 'all';
export type PinExportFormat = 'text' | 'csv' | 'json';

export interface PinExportContext {
  tripTitle: string;
  currentDay: number;
  totalDays: number;
  pinnedByDay: Record<number, PinnedPlace[]>;
  scope: PinExportScope;
}

export interface PinDayGroup {
  day: number;
  pins: PinnedPlace[];
}

function tExport(key: string, opts?: Record<string, unknown>): string {
  return i18n.t(`export.${key}`, { ns: 'planner', ...opts });
}

export function hasExportablePins(pinnedByDay: Record<number, PinnedPlace[]>): boolean {
  return Object.values(pinnedByDay).some((list) => list.length > 0);
}

export function getPinGroupsForScope(ctx: PinExportContext): PinDayGroup[] {
  if (ctx.scope === 'current') {
    const pins = sortPins(ctx.pinnedByDay[ctx.currentDay] ?? []);
    return pins.length ? [{ day: ctx.currentDay, pins }] : [];
  }

  const groups: PinDayGroup[] = [];
  for (let day = 1; day <= ctx.totalDays; day++) {
    const pins = sortPins(ctx.pinnedByDay[day] ?? []);
    if (pins.length) groups.push({ day, pins });
  }
  return groups;
}

function sortPins(pins: PinnedPlace[]): PinnedPlace[] {
  return [...pins].sort((a, b) => a.order - b.order);
}

export function buildPinMapLink(pin: PinnedPlace): string {
  if (pin.placeUrl) return pin.placeUrl;
  return `https://map.kakao.com/link/map/${pin.lat},${pin.lng}`;
}

function csvEscape(value: string | number | undefined | null): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function formatPinsAsText(ctx: PinExportContext): string {
  const groups = getPinGroupsForScope(ctx);
  if (!groups.length) return '';
  const lines: string[] = [
    `# ${ctx.tripTitle}`,
    `${tExport('tripName')}: ${ctx.tripTitle}`,
    '',
  ];
  for (const { day, pins } of groups) {
    if (ctx.scope === 'all' || ctx.totalDays > 1) {
      lines.push('', `## ${tExport('dayHeading', { day })}`);
    }
    for (const pin of pins) {
      lines.push(
        `${pin.order}. ${pin.name} (${pin.categoryLabel})`,
        `   ${tExport('address')}: ${pin.roadAddress || pin.address}`,
        ...(pin.phone ? [`   ${tExport('phone')}: ${pin.phone}`] : []),
        ...(pin.stayMinutes
          ? [`   ${tExport('stay')}: ${tExport('stayMinutes', { n: pin.stayMinutes })}`]
          : []),
        ...(pin.note ? [`   ${tExport('note')}: ${pin.note}`] : []),
        `   ${tExport('coords')}: ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`,
        `   ${tExport('mapLink')}: ${buildPinMapLink(pin)}`
      );
    }
  }
  return lines.join('\n').trim();
}

export function formatPinsAsCsv(ctx: PinExportContext): string {
  const groups = getPinGroupsForScope(ctx);
  const h = (k: string) => tExport(`csvHeaders.${k}`);
  const header = [
    h('trip'),
    h('day'),
    h('order'),
    h('name'),
    h('category'),
    h('address'),
    h('road'),
    h('phone'),
    h('lat'),
    h('lng'),
    h('stay'),
    h('note'),
    h('map'),
  ];
  const rows = [header.join(',')];

  for (const { day, pins } of groups) {
    for (const pin of pins) {
      rows.push(
        [
          ctx.tripTitle,
          day,
          pin.order,
          pin.name,
          pin.categoryLabel,
          pin.address,
          pin.roadAddress ?? '',
          pin.phone ?? '',
          pin.lat,
          pin.lng,
          pin.stayMinutes ?? '',
          pin.note ?? '',
          buildPinMapLink(pin),
        ]
          .map(csvEscape)
          .join(',')
      );
    }
  }

  return `\uFEFF${rows.join('\n')}`;
}

export function formatPinsAsJson(ctx: PinExportContext): string {
  const groups = getPinGroupsForScope(ctx);
  const payload = {
    title: ctx.tripTitle,
    locale: i18n.language,
    exportedAt: new Date().toISOString(),
    scope: ctx.scope,
    days: groups.map(({ day, pins }) => ({
      day,
      pins: pins.map((p) => ({
        order: p.order,
        name: p.name,
        category: p.categoryLabel,
        address: p.address,
        roadAddress: p.roadAddress,
        phone: p.phone,
        lat: p.lat,
        lng: p.lng,
        stayMinutes: p.stayMinutes,
        note: p.note,
        mapLink: buildPinMapLink(p),
      })),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

export function sanitizeExportFilename(title: string): string {
  const trimmed = title.trim() || 'trip';
  return trimmed.replace(/[^\w\uAC00-\uD7A3\-_.]+/g, '_').slice(0, 40);
}

export function buildExportFilename(
  ctx: PinExportContext,
  format: PinExportFormat
): string {
  const base = sanitizeExportFilename(ctx.tripTitle);
  const scopeLabel =
    ctx.scope === 'all'
      ? tExport('scopeAll')
      : tExport('scopeDay', { day: ctx.currentDay });
  const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
  return `${base}_${scopeLabel}_pins.${ext}`;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportPins(ctx: PinExportContext, format: PinExportFormat): boolean {
  const groups = getPinGroupsForScope(ctx);
  if (!groups.length) return false;

  if (format === 'text') {
    downloadFile(buildExportFilename(ctx, 'text'), formatPinsAsText(ctx), 'text/plain;charset=utf-8');
    return true;
  }
  if (format === 'csv') {
    downloadFile(buildExportFilename(ctx, 'csv'), formatPinsAsCsv(ctx), 'text/csv;charset=utf-8');
    return true;
  }
  downloadFile(buildExportFilename(ctx, 'json'), formatPinsAsJson(ctx), 'application/json;charset=utf-8');
  return true;
}

export async function copyPinsToClipboard(ctx: PinExportContext): Promise<boolean> {
  const text = formatPinsAsText(ctx);
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
