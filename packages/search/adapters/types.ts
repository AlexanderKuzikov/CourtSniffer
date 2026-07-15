import type { SearchRequest, SearchResult } from '../types.js';

export interface SearchAdapter {
  /** Поиск по номеру дела */
  searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]>;
  /** Поиск по участникам (истец/ответчик) */
  searchByParty(req: SearchRequest): Promise<SearchResult[]>;
  /** Построение URL поиска */
  buildSearchUrl(req: SearchRequest): string;
}
