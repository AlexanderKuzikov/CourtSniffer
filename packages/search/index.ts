export { getSearchAdapter } from './adapters/registry.js';
export type { SearchAdapter } from './adapters/types.js';
export { findCourtBySubdomain, findCourtByCode, findCourtsByRegion, findCourtsByName } from './courts.js';
export type { SearchRequest, SearchResult, CourtType } from './types.js';
