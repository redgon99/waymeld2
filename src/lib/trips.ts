import type {
  PinnedPlace,
  RouteOptions,
  GeneratedRoute,
  TripMaterial,
  TripTheme,
  FoodRestriction,
} from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { normalizeTrip, DEFAULT_ROUTE_OPTIONS } from './tripRouteOptions';
import { computeTripCenter } from './tripGeo';
import i18n from './i18n';
import { normalizeLocale } from './locale';

export interface Trip {
  id: string;
  slug: string;
  title: string;
  totalDays: number;
  currentDay: number;
  pinnedByDay: Record<number, PinnedPlace[]>;
  /** 일차별 경로 옵션 (출발지·이동수단 등) */
  routeOptionsByDay: Record<number, RouteOptions>;
  /** 현재 일차 옵션 미러 (저장 호환) */
  routeOptions?: RouteOptions;
  generatedRouteByDay: Record<number, GeneratedRoute | null>;
  /** 여행 자료 (텍스트·사진·파일 메타) */
  materials?: TripMaterial[];
  createdAt: number;
  updatedAt: number;
  ownerId?: string;
  isPublic?: boolean;
  listedInPlaza?: boolean;
  plazaDisplayName?: string;
  plazaContactEmail?: string;
  plazaCenterLat?: number;
  plazaCenterLng?: number;
  plazaListedAt?: number;
  plazaLocale?: string;
  /** 관심 테마 (K-food, K-pop 등) */
  preferences?: TripTheme[];
  /** 음식 제약 */
  foodRestrictions?: FoodRestriction[];
  /** 여행 지역 (서울, 부산 등) */
  region?: string;
}

export interface PlazaListing {
  id: string;
  slug: string;
  title: string;
  displayName: string | null;
  contactEmail: string | null;
  center: { lat: number; lng: number } | null;
  listedAt: number;
  totalDays: number;
  pinSummary: string;
  pinnedByDay: Record<number, PinnedPlace[]>;
  locale?: string | null;
}

export interface TripSummary {
  id: string;
  slug: string;
  title: string;
  updatedAt: number;
  totalDays: number;
}

const LS_STORE = 'tripasist:trips-store:v2';
const LS_PLAZA_IMPORTED = 'tripasist:plaza-imported-ids';

interface LocalStore {
  activeId: string | null;
  trips: Trip[];
}

function readStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LS_STORE);
    if (!raw) return { activeId: null, trips: [] };
    const parsed = JSON.parse(raw) as LocalStore;
    return {
      activeId: parsed.activeId ?? null,
      trips: Array.isArray(parsed.trips) ? parsed.trips : [],
    };
  } catch {
    return { activeId: null, trips: [] };
  }
}

function writeStore(store: LocalStore) {
  try {
    localStorage.setItem(LS_STORE, JSON.stringify(store));
  } catch (e) {
    console.warn('localStorage 저장 실패', e);
  }
}

function rowToTrip(data: {
  id: string;
  slug: string;
  title: string;
  total_days: number;
  current_day: number;
  payload: unknown;
  created_at: string;
  updated_at: string;
  owner_id?: string | null;
  is_public?: boolean | null;
  listed_in_plaza?: boolean | null;
  plaza_display_name?: string | null;
  plaza_contact_email?: string | null;
  plaza_center_lat?: number | null;
  plaza_center_lng?: number | null;
  plaza_listed_at?: string | null;
  plaza_locale?: string | null;
}): Trip {
  const payload = data.payload as {
    pinnedByDay?: Trip['pinnedByDay'];
    routeOptions?: RouteOptions;
    routeOptionsByDay?: Record<number, RouteOptions>;
    generatedRouteByDay?: Trip['generatedRouteByDay'];
    materials?: TripMaterial[];
  };
  return normalizeTrip({
    id: data.id,
    slug: data.slug,
    title: data.title,
    totalDays: data.total_days,
    currentDay: data.current_day,
    pinnedByDay: payload?.pinnedByDay ?? { 1: [] },
    routeOptionsByDay: payload?.routeOptionsByDay ?? {},
    routeOptions: payload?.routeOptions,
    generatedRouteByDay: payload?.generatedRouteByDay ?? {},
    materials: payload?.materials ?? [],
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    ownerId: data.owner_id ?? undefined,
    isPublic: data.is_public ?? false,
    listedInPlaza: data.listed_in_plaza ?? false,
    plazaDisplayName: data.plaza_display_name ?? undefined,
    plazaContactEmail: data.plaza_contact_email ?? undefined,
    plazaCenterLat: data.plaza_center_lat ?? undefined,
    plazaCenterLng: data.plaza_center_lng ?? undefined,
    plazaListedAt: data.plaza_listed_at
      ? new Date(data.plaza_listed_at).getTime()
      : undefined,
    plazaLocale: data.plaza_locale ?? undefined,
  });
}

const TRIP_SELECT =
  'id, slug, title, total_days, current_day, payload, created_at, updated_at, owner_id, is_public, listed_in_plaza, plaza_display_name, plaza_contact_email, plaza_center_lat, plaza_center_lng, plaza_listed_at, plaza_locale';

const PLAZA_LIST_SELECT =
  'id, slug, title, total_days, payload, listed_in_plaza, plaza_display_name, plaza_contact_email, plaza_center_lat, plaza_center_lng, plaza_listed_at, plaza_locale';

export function buildPlazaPinSummary(
  pinnedByDay: Record<number, PinnedPlace[]>,
  totalDays: number
): string {
  const parts: string[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const pins = pinnedByDay[d] ?? [];
    if (pins.length === 0) continue;
    const names = pins
      .slice(0, 3)
      .map((p) => p.name)
      .join(', ');
    const more = pins.length > 3 ? ` 외 ${pins.length - 3}곳` : '';
    parts.push(`${d}일차: ${names}${more}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '등록된 장소 없음';
}

function rowToPlazaListing(data: {
  id: string;
  slug: string;
  title: string;
  total_days: number;
  payload: unknown;
  plaza_display_name?: string | null;
  plaza_contact_email?: string | null;
  plaza_center_lat?: number | null;
  plaza_center_lng?: number | null;
  plaza_listed_at?: string | null;
  plaza_locale?: string | null;
}): PlazaListing {
  const payload = data.payload as { pinnedByDay?: Record<number, PinnedPlace[]> };
  const pinnedByDay = payload?.pinnedByDay ?? { 1: [] };
  const center =
    data.plaza_center_lat != null && data.plaza_center_lng != null
      ? { lat: data.plaza_center_lat, lng: data.plaza_center_lng }
      : null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    displayName: data.plaza_display_name ?? null,
    contactEmail: data.plaza_contact_email ?? null,
    center,
    listedAt: data.plaza_listed_at
      ? new Date(data.plaza_listed_at).getTime()
      : Date.now(),
    totalDays: data.total_days,
    pinSummary: buildPlazaPinSummary(pinnedByDay, data.total_days),
    pinnedByDay,
    locale: data.plaza_locale ?? 'ko',
  };
}

function readLocalPlazaImported(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_PLAZA_IMPORTED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeLocalPlazaImported(ids: Set<string>) {
  try {
    localStorage.setItem(LS_PLAZA_IMPORTED, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function applyPlazaPublish(
  trip: Trip,
  opts: { displayName?: string; email: string; listInPlaza: boolean }
): Trip {
  const base: Trip = {
    ...trip,
    isPublic: true,
    updatedAt: Date.now(),
  };
  if (!opts.listInPlaza) {
    return base;
  }
  const center = computeTripCenter(trip);
  const now = Date.now();
  return {
    ...base,
    listedInPlaza: true,
    plazaDisplayName: opts.displayName?.trim() || undefined,
    plazaContactEmail: opts.email.trim(),
    plazaCenterLat: center?.lat,
    plazaCenterLng: center?.lng,
    plazaListedAt: now,
    plazaLocale: normalizeLocale(i18n.language),
  };
}

async function listRemote(userId: string): Promise<TripSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('tripsasist')
    .select('id, slug, title, total_days, updated_at')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    totalDays: row.total_days,
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

async function readRemoteById(userId: string, tripId: string): Promise<Trip | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('tripsasist')
    .select(TRIP_SELECT)
    .eq('owner_id', userId)
    .eq('id', tripId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToTrip(data);
}

async function readRemoteLatest(userId: string): Promise<Trip | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('tripsasist')
    .select(TRIP_SELECT)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return rowToTrip(data);
}

async function readBySlugRemote(slug: string): Promise<Trip | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('tripsasist')
    .select(TRIP_SELECT)
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();
  if (error || !data) return null;
  return rowToTrip(data);
}

async function writeRemote(trip: Trip): Promise<void> {
  const sb = getSupabase();
  if (!sb || !trip.ownerId) return;
  const normalized = normalizeTrip(trip);
  const payload = {
    pinnedByDay: normalized.pinnedByDay,
    routeOptionsByDay: normalized.routeOptionsByDay,
    routeOptions: normalized.routeOptionsByDay[normalized.currentDay] ?? DEFAULT_ROUTE_OPTIONS,
    generatedRouteByDay: normalized.generatedRouteByDay,
    materials: normalized.materials ?? [],
  };
  const { error } = await sb.from('tripsasist').upsert(
    {
      id: trip.id,
      slug: trip.slug,
      title: trip.title,
      total_days: trip.totalDays,
      current_day: trip.currentDay,
      payload,
      owner_id: trip.ownerId,
      is_public: trip.isPublic ?? false,
      listed_in_plaza: trip.listedInPlaza ?? false,
      plaza_display_name: trip.plazaDisplayName ?? null,
      plaza_contact_email: trip.plazaContactEmail ?? null,
      plaza_center_lat: trip.plazaCenterLat ?? null,
      plaza_center_lng: trip.plazaCenterLng ?? null,
      plaza_listed_at: trip.plazaListedAt
        ? new Date(trip.plazaListedAt).toISOString()
        : null,
      plaza_locale: trip.plazaLocale ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

async function listPlazaRemote(localeFilter?: string | null): Promise<PlazaListing[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb
    .from('tripsasist')
    .select(PLAZA_LIST_SELECT)
    .eq('listed_in_plaza', true)
    .eq('is_public', true);
  if (localeFilter) {
    query = query.eq('plaza_locale', localeFilter);
  }
  const { data, error } = await query.order('plaza_listed_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => rowToPlazaListing(row));
}

function listPlazaLocal(): PlazaListing[] {
  const store = readStore();
  return store.trips
    .filter((t) => t.isPublic && t.listedInPlaza)
    .sort((a, b) => (b.plazaListedAt ?? 0) - (a.plazaListedAt ?? 0))
    .map((t) => {
      const center =
        t.plazaCenterLat != null && t.plazaCenterLng != null
          ? { lat: t.plazaCenterLat, lng: t.plazaCenterLng }
          : computeTripCenter(t);
      return {
        id: t.id,
        slug: t.slug,
        title: t.title,
        displayName: t.plazaDisplayName ?? null,
        contactEmail: t.plazaContactEmail ?? null,
        center,
        listedAt: t.plazaListedAt ?? t.updatedAt,
        totalDays: t.totalDays,
        pinSummary: buildPlazaPinSummary(t.pinnedByDay, t.totalDays),
        pinnedByDay: t.pinnedByDay,
        locale: t.plazaLocale ?? 'ko',
      };
    });
}

function listPlazaLocalFiltered(localeFilter?: string | null): PlazaListing[] {
  const all = listPlazaLocal();
  if (!localeFilter) return all;
  return all.filter((e) => (e.locale ?? 'ko') === localeFilter);
}

async function getImportedSourceIdsRemote(userId: string): Promise<Set<string>> {
  const sb = getSupabase();
  if (!sb) return new Set();
  const { data, error } = await sb
    .from('share_plaza_imports')
    .select('source_trip_id')
    .eq('importer_id', userId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.source_trip_id as string));
}

async function recordPlazaImportRemote(
  sourceTripId: string,
  clonedTripId: string,
  userId: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { error } = await sb.from('share_plaza_imports').upsert(
    {
      source_trip_id: sourceTripId,
      importer_id: userId,
      cloned_trip_id: clonedTripId,
    },
    { onConflict: 'source_trip_id,importer_id' }
  );
  if (error) throw error;
}

export async function listPlazaEntries(
  localeFilter?: string | null
): Promise<PlazaListing[]> {
  if (isSupabaseConfigured) {
    const remote = await listPlazaRemote(localeFilter);
    if (remote.length > 0) return remote;
  }
  return listPlazaLocalFiltered(localeFilter);
}

export async function getImportedSourceIds(
  userId?: string | null
): Promise<Set<string>> {
  if (isSupabaseConfigured && userId) {
    return getImportedSourceIdsRemote(userId);
  }
  return readLocalPlazaImported();
}

export async function recordPlazaImport(
  sourceTripId: string,
  clonedTripId: string,
  userId?: string | null
): Promise<void> {
  if (isSupabaseConfigured && userId) {
    await recordPlazaImportRemote(sourceTripId, clonedTripId, userId);
    return;
  }
  const ids = readLocalPlazaImported();
  ids.add(sourceTripId);
  writeLocalPlazaImported(ids);
}

/** 마당 항목을 Trip으로 조립 (끌어오기용) */
export function plazaListingToTrip(listing: PlazaListing): Trip {
  return normalizeTrip({
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    totalDays: listing.totalDays,
    currentDay: 1,
    pinnedByDay: listing.pinnedByDay,
    routeOptionsByDay: {},
    generatedRouteByDay: {},
    isPublic: true,
    createdAt: listing.listedAt,
    updatedAt: listing.listedAt,
  });
}

function listLocal(): TripSummary[] {
  const store = readStore();
  return [...store.trips]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      totalDays: t.totalDays,
      updatedAt: t.updatedAt,
    }));
}

function readLocal(tripId?: string): Trip | null {
  const store = readStore();
  if (store.trips.length === 0) return null;
  const id = tripId ?? store.activeId ?? store.trips[0]?.id;
  return store.trips.find((t) => t.id === id) ?? null;
}

function readLocalBySlug(slug: string): Trip | null {
  const store = readStore();
  const trip = store.trips.find((t) => t.slug === slug && t.isPublic);
  return trip ?? null;
}

function writeLocal(trip: Trip) {
  const normalized = normalizeTrip(trip);
  const store = readStore();
  const idx = store.trips.findIndex((t) => t.id === normalized.id);
  const nextTrips =
    idx >= 0
      ? store.trips.map((t, i) => (i === idx ? normalized : t))
      : [...store.trips, normalized];
  writeStore({ activeId: normalized.id, trips: nextTrips });
}

function deleteLocal(tripId: string): string | null {
  const store = readStore();
  const nextTrips = store.trips.filter((t) => t.id !== tripId);
  let activeId = store.activeId;
  if (activeId === tripId) {
    activeId = nextTrips[0]?.id ?? null;
  }
  writeStore({ activeId, trips: nextTrips });
  return activeId;
}

async function deleteRemote(userId: string, tripId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from('tripsasist')
    .delete()
    .eq('id', tripId)
    .eq('owner_id', userId);
  if (error) throw error;
}

export interface TripsRepo {
  list(userId?: string | null): Promise<TripSummary[]>;
  load(userId?: string | null, tripId?: string): Promise<Trip | null>;
  loadBySlug(slug: string): Promise<Trip | null>;
  save(trip: Trip): Promise<void>;
  delete(userId: string | null | undefined, tripId: string): Promise<void>;
  reset(): Promise<void>;
  migrateLocalToUser(userId: string): Promise<number>;
}

export const tripsRepo: TripsRepo = {
  async list(userId) {
    if (isSupabaseConfigured && userId) {
      const remote = await listRemote(userId);
      if (remote.length > 0) return remote;
    }
    return listLocal();
  },

  async load(userId, tripId) {
    if (isSupabaseConfigured && userId) {
      if (tripId) {
        const byId = await readRemoteById(userId, tripId);
        if (byId) return byId;
      }
      const latest = await readRemoteLatest(userId);
      if (latest) return latest;
    }
    return readLocal(tripId);
  },

  async loadBySlug(slug) {
    if (isSupabaseConfigured) {
      const remote = await readBySlugRemote(slug);
      if (remote) return remote;
    }
    return readLocalBySlug(slug);
  },

  async save(trip) {
    writeLocal(trip);
    if (isSupabaseConfigured && trip.ownerId) {
      await writeRemote(trip);
    }
  },

  async delete(userId, tripId) {
    deleteLocal(tripId);
    if (isSupabaseConfigured && userId) {
      await deleteRemote(userId, tripId);
    }
  },

  async reset() {
    localStorage.removeItem(LS_STORE);
  },

  async migrateLocalToUser(userId) {
    if (!isSupabaseConfigured) return 0;
    const store = readStore();
    if (store.trips.length === 0) return 0;

    let migrated = 0;
    for (const trip of store.trips) {
      const normalized = normalizeTrip({ ...trip, ownerId: userId });
      try {
        await writeRemote(normalized);
        writeLocal(normalized);
        migrated++;
      } catch (e) {
        console.warn('로컬 여행 클라우드 업로드 실패', trip.id, e);
      }
    }
    return migrated;
  },
};

export function createSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export function createTripId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 공유 여행을 내 계정/로컬 저장소에 복사 */
export function cloneTripFromShare(source: Trip, ownerId?: string): Trip {
  const pinnedByDay: Trip['pinnedByDay'] = {};
  for (const [dayKey, list] of Object.entries(source.pinnedByDay ?? {})) {
    pinnedByDay[Number(dayKey)] = list.map((p) => ({ ...p }));
  }
  const routeOptionsByDay: Trip['routeOptionsByDay'] = {};
  for (const [dayKey, opts] of Object.entries(source.routeOptionsByDay ?? {})) {
    routeOptionsByDay[Number(dayKey)] = {
      ...opts,
      origin: { ...opts.origin },
    };
  }
  const generatedRouteByDay: Trip['generatedRouteByDay'] = {
    ...(source.generatedRouteByDay ?? {}),
  };

  return normalizeTrip({
    id: createTripId(),
    slug: createSlug(),
    title: source.title,
    totalDays: source.totalDays,
    currentDay: source.currentDay,
    pinnedByDay,
    routeOptionsByDay,
    generatedRouteByDay,
    materials: (source.materials ?? []).map((m) => ({ ...m })),
    ownerId,
    isPublic: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
