import type { SearchRequest, SearchResult } from '../types.js';

export interface SearchAdapter {
  searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]>;
  searchByParty(req: SearchRequest): Promise<SearchResult[]>;
  buildSearchUrl(req: SearchRequest): string;
}
