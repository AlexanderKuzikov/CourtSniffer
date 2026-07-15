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

const raw = JSON.parse(readFileSync(COURTS_PATH, 'utf-8'));
const courts: Record<string, RawCourtEntry> = raw.courts;
const entries = Object.values(courts);

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

export function findCourtBySubdomain(subdomain: string): CourtInfo | null {
  for (const e of entries) {
    if (extractSubdomain(e.website) === subdomain) {
      return {
        code: e.code,
        name: e.name,
        courtType: inferCourtType(e.court_type),
        subdomain,
        region: extractRegion(e.code),
        address: e.address,
        website: e.website,
      };
    }
  }
  return null;
}

export function findCourtByCode(code: string): CourtInfo | null {
  const e = courts[code];
  if (!e) return null;
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

export function findCourtsByRegion(region: string): CourtInfo[] {
  return entries
    .filter(e => e.code.startsWith(region))
    .map(e => ({
      code: e.code,
      name: e.name,
      courtType: inferCourtType(e.court_type),
      subdomain: extractSubdomain(e.website),
      region: extractRegion(e.code),
      address: e.address,
      website: e.website,
    }));
}

export function findCourtsByName(query: string): CourtInfo[] {
  const q = query.toLowerCase();
  return entries
    .filter(e => e.name.toLowerCase().includes(q))
    .map(e => ({
      code: e.code,
      name: e.name,
      courtType: inferCourtType(e.court_type),
      subdomain: extractSubdomain(e.website),
      region: extractRegion(e.code),
      address: e.address,
      website: e.website,
    }))
    .slice(0, 50);
}

export function getTotalCourts(): number {
  return entries.length;
}
