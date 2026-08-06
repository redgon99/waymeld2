import type { TripMaterial } from '../types';
import { downloadFile, sanitizeExportFilename } from './exportPins';

export type MaterialsExportFormat = 'text' | 'csv' | 'json';

export interface MaterialsExportContext {
  tripTitle: string;
  materials: TripMaterial[];
}

function csvEscape(value: string | number | undefined | null): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function kindLabel(kind: TripMaterial['kind']): string {
  if (kind === 'text') return '텍스트';
  if (kind === 'image') return '사진';
  return '파일';
}

export function formatMaterialsAsText(ctx: MaterialsExportContext): string {
  const title = ctx.tripTitle.trim() || '여행';
  const lines: string[] = [`# ${title}`, `여행명: ${title}`, ''];

  if (ctx.materials.length === 0) {
    lines.push('(자료 없음)');
    return lines.join('\n').trim();
  }

  for (const m of ctx.materials) {
    lines.push(`## ${m.title} (${kindLabel(m.kind)})`);
    if (m.day != null) lines.push(`일차: ${m.day}일`);
    if (m.pinnedPlaceName) lines.push(`장소: ${m.pinnedPlaceName}`);
    if (m.kind === 'text' && m.body) {
      lines.push(m.body);
    } else if (m.fileName) {
      lines.push(`파일: ${m.fileName}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function formatMaterialsAsCsv(ctx: MaterialsExportContext): string {
  const title = ctx.tripTitle.trim() || '여행';
  const header = [
    '여행명',
    '제목',
    '종류',
    '일차',
    '연결장소',
    '본문',
    '파일명',
    '용량(바이트)',
    'mime',
    'storagePath',
    '생성일',
    '수정일',
  ];
  const rows = [header.join(',')];

  for (const m of ctx.materials) {
    rows.push(
      [
        title,
        m.title,
        kindLabel(m.kind),
        m.day ?? '',
        m.pinnedPlaceName ?? '',
        m.kind === 'text' ? m.body ?? '' : '',
        m.fileName ?? '',
        m.byteSize ?? '',
        m.mimeType ?? '',
        m.storagePath ?? '',
        new Date(m.createdAt).toISOString(),
        new Date(m.updatedAt).toISOString(),
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return `\uFEFF${rows.join('\n')}`;
}

export function formatMaterialsAsJson(ctx: MaterialsExportContext): string {
  const title = ctx.tripTitle.trim() || '여행';
  return JSON.stringify(
    {
      tripTitle: title,
      exportedAt: new Date().toISOString(),
      materials: ctx.materials.map((m) => ({
        id: m.id,
        kind: m.kind,
        title: m.title,
        body: m.body ?? null,
        storagePath: m.storagePath ?? null,
        mimeType: m.mimeType ?? null,
        fileName: m.fileName ?? null,
        byteSize: m.byteSize ?? null,
        day: m.day ?? null,
        pinnedPlaceId: m.pinnedPlaceId ?? null,
        pinnedPlaceName: m.pinnedPlaceName ?? null,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    },
    null,
    2
  );
}

export function buildMaterialsExportFilename(
  tripTitle: string,
  format: MaterialsExportFormat
): string {
  const base = sanitizeExportFilename(tripTitle);
  const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
  return `${base}_자료.${ext}`;
}

export async function copyMaterialsToClipboard(
  ctx: MaterialsExportContext
): Promise<boolean> {
  const text = formatMaterialsAsText(ctx);
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

export function exportMaterials(
  ctx: MaterialsExportContext,
  format: MaterialsExportFormat
): void {
  if (format === 'text') {
    downloadFile(
      buildMaterialsExportFilename(ctx.tripTitle, 'text'),
      formatMaterialsAsText(ctx),
      'text/plain;charset=utf-8'
    );
    return;
  }
  if (format === 'csv') {
    downloadFile(
      buildMaterialsExportFilename(ctx.tripTitle, 'csv'),
      formatMaterialsAsCsv(ctx),
      'text/csv;charset=utf-8'
    );
    return;
  }
  downloadFile(
    buildMaterialsExportFilename(ctx.tripTitle, 'json'),
    formatMaterialsAsJson(ctx),
    'application/json;charset=utf-8'
  );
}
