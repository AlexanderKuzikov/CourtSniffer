// Справочник судов РФ — данные из CourtHarvest2
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { CourtType } from './types.js';

const COURTS_PATH = resolve(import.meta.dirname, 'data', 'courts.json');

interface RawCourtEntry {
  code: string;
  name: string;
  inn: string;
  court_type: string;
  court_type_name: string;
  address: string;
  legal_address: string;
  website: string;
}

export interface CourtInfo {
  code: string;
  name: string;
  courtType: CourtType;
  subdomain: string;
  region: string;
  address: string;
  website: string;
}

const COURT_TYPE_CODE: Record<string, CourtType> = {
  RS: 'district',
  MS: 'magistrate',
  AS: 'appeal',
  OS: 'appeal',
  VS: 'appeal',
  KAS: 'cassation',
  GV: 'district',
  OV: 'appeal',
  KV: 'district',
  AV: 'appeal',
  KJ: 'appeal',
  AJ: 'appeal',
  AA: 'appeal',
  AO: 'appeal',
};

function inferCourtType(type: string): CourtType {
  return COURT_TYPE_CODE[type] || 'district';
}

function extractSubdomain(website: string): string {
  if (!website) return '';
  // http://sverdlov.perm.sudrf.ru → sverdlov--perm
  // http://6.perm.msudrf.ru → 6.perm
  const match = website.match(/https?:\/\/([^.]+)\.([^.]+)\.(sudrf|msudrf)\.ru/);
  if (match) {
    const name = match[1];
    const region = match[2];
    if (match[3] === 'msudrf') return name + '.' + region;
    return name + '--' + region;
  }
  return '';
}

function extractRegion(code: string): string {
  return code.substring(0, 2);
}

function toCourtInfo(e: RawCourtEntry): CourtInfo {
  return {
    code: e.code,
    name: e.name,
    courtType: inferCourtType(e.court_type),
    subdomain: extractSubdomain(e.website),
    region: extractRegion(e.code),
    address: e.address,
    website: e.website,
  };
}

const raw = JSON.parse(readFileSync(COURTS_PATH, 'utf-8')) as { courts: Record<string, RawCourtEntry> };
const courts = raw.courts;
const entries = Object.values(courts);

// Индексы для O(1)-lookup — критично для viewer (каждый запрос дергает lookup).
// Строятся один раз при загрузке модуля; findCourtsByName остаётся линейным (текстовый поиск).
const bySubdomain = new Map<string, CourtInfo>();
const byCode = new Map<string, CourtInfo>();
for (const e of entries) {
  const info = toCourtInfo(e);
  if (info.subdomain) bySubdomain.set(info.subdomain, info);
  byCode.set(info.code, info);
}

export function findCourtBySubdomain(subdomain: string): CourtInfo | null {
  return bySubdomain.get(subdomain) ?? null;
}

export function findCourtByCode(code: string): CourtInfo | null {
  return byCode.get(code) ?? null;
}

export function findCourtsByRegion(region: string): CourtInfo[] {
  return entries
    .filter(e => e.code.startsWith(region))
    .map(toCourtInfo);
}

export function findCourtsByName(query: string): CourtInfo[] {
  const q = query.toLowerCase();
  return entries
    .filter(e => e.name.toLowerCase().includes(q))
    .map(toCourtInfo)
    .slice(0, 50);
}

export function getTotalCourts(): number {
  return entries.length;
}
