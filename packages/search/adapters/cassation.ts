// Поиск по кассационным судам (*kas.sudrf.ru)
import type { SearchRequest, SearchResult } from '../types.js';
import type { SearchAdapter } from './types.js';

export class CassationSearchAdapter implements SearchAdapter {
  async searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
    // TODO: для kas.sudrf.ru delo_id=2800001
    throw new Error('Кассационный поиск пока не реализован');
  }

  async searchByParty(req: SearchRequest): Promise<SearchResult[]> {
    throw new Error('Кассационный поиск пока не реализован');
  }

  buildSearchUrl(req: SearchRequest): string {
    const base = `https://${req.courtId}.sudrf.ru/modules.php`;
    const params = new URLSearchParams();
    params.set('name', 'sud_delo');
    params.set('srv_num', '1');
    params.set('name_op', 'r');
    params.set('delo_id', '2800001');  // кассация
    params.set('case_type', '4');
    params.set('new', '0');
    if (req.caseNumber) params.set('g1_case__CASE_NUMBERSS', req.caseNumber);
    params.set('Submit', 'Найти');
    return base + '?' + params.toString();
  }
}
