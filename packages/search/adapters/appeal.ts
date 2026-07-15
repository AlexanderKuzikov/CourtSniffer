// Поиск по апелляционным судам (*oblsud--*.sudrf.ru)
import type { SearchRequest, SearchResult } from '../types.js';
import type { SearchAdapter } from './types.js';

export class AppealSearchAdapter implements SearchAdapter {
  async searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
    // TODO: для oblsud--*.sudrf.ru delo_id=5
    throw new Error('Апелляционный поиск пока не реализован');
  }

  async searchByParty(req: SearchRequest): Promise<SearchResult[]> {
    throw new Error('Апелляционный поиск пока не реализован');
  }

  buildSearchUrl(req: SearchRequest): string {
    const base = `https://${req.courtId}.sudrf.ru/modules.php`;
    const params = new URLSearchParams();
    params.set('name', 'sud_delo');
    params.set('srv_num', '1');
    params.set('name_op', 'r');
    params.set('delo_id', '5');  // апелляция
    params.set('case_type', '1');
    params.set('new', '0');
    if (req.caseNumber) params.set('g1_case__CASE_NUMBERSS', req.caseNumber);
    if (req.defendant) params.set('G1_PARTS__NAMESS', req.defendant);
    if (req.plaintiff) params.set('G1_PARTS__NAMESS', req.plaintiff);
    params.set('Submit', 'Найти');
    return base + '?' + params.toString();
  }
}
