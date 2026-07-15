export { getSearchAdapter } from './adapters/registry.js';
export type { SearchAdapter } from './adapters/types.js';
export { findCourtBySubdomain, findCourtByCode, findCourtsByRegion, findCourtsByName, getTotalCourts } from './courts.js';
export type { CourtInfo } from './courts.js';
export type { SearchRequest, SearchResult, CourtType } from './types.js';
export { hasCaptchaKeys, getRuCaptchaKey } from './config.js';
export { encodeParam } from './encoding.js';