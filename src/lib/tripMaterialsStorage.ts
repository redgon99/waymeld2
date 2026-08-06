import { getSupabase } from './supabase';

export const TRIP_MATERIALS_BUCKET = 'trip-materials';
export const MAX_MATERIAL_BYTES = 15 * 1024 * 1024;

export function createMaterialId(): string {
  return crypto.randomUUID();
}

/**
 * Supabase Storage 객체 키는 URL-safe ASCII만 허용합니다.
 * 한글·괄호 등은 Invalid key 오류를 내므로, 경로용 이름은 ASCII만 사용합니다.
 * 원본 파일명은 TripMaterial.fileName / title에 따로 저장합니다.
 */
export function sanitizeMaterialFileName(name: string): string {
  const trimmed = name.replace(/[/\\]/g, '').trim();
  const dot = trimmed.lastIndexOf('.');
  let ext = '';
  if (dot > 0 && dot < trimmed.length - 1) {
    ext = trimmed
      .slice(dot)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    if (!/^\.[a-z0-9]{1,12}$/.test(ext)) ext = '';
  }
  return `file${ext}` || 'file';
}

export function buildMaterialStoragePath(
  userId: string,
  tripId: string,
  materialId: string,
  fileName: string
): string {
  return `${userId}/${tripId}/${materialId}/${sanitizeMaterialFileName(fileName)}`;
}

export function inferMaterialKindFromFile(file: File): 'image' | 'file' {
  return file.type.startsWith('image/') ? 'image' : 'file';
}

export function validateMaterialFile(file: File): string | null {
  if (file.size > MAX_MATERIAL_BYTES) {
    return '파일 크기는 15MB 이하여야 합니다.';
  }
  return null;
}

export async function uploadMaterialFile(
  userId: string,
  tripId: string,
  materialId: string,
  file: File
): Promise<string> {
  const err = validateMaterialFile(file);
  if (err) throw new Error(err);

  const sb = getSupabase();
  if (!sb) throw new Error('클라우드 저장이 설정되지 않았습니다.');

  const storagePath = buildMaterialStoragePath(userId, tripId, materialId, file.name);
  const { error } = await sb.storage
    .from(TRIP_MATERIALS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  return storagePath;
}

export async function getMaterialSignedUrl(
  storagePath: string,
  expiresSec = 3600
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage
    .from(TRIP_MATERIALS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function removeMaterialFile(storagePath: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.storage.from(TRIP_MATERIALS_BUCKET).remove([storagePath]);
  if (error) throw error;
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
