// Поиск по мировым судам (*.msudrf.ru) — через Puppeteer+RuCaptcha
import type { SearchRequest, SearchResult } from '../types.js';
import type { SearchAdapter } from './types.js';

export class MagistrateSearchAdapter implements SearchAdapter {
  async searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
    // TODO: через Puppeteer+RuCaptcha (как CourtFlow's captcha/session.ts)
    throw new Error('Поиск по мировым судам требует капчи (Puppeteer+RuCaptcha)');
  }

  async searchByParty(req: SearchRequest): Promise<SearchResult[]> {
    throw new Error('Поиск по мировым судам требует капчи (Puppeteer+RuCaptcha)');
  }

  buildSearchUrl(req: SearchRequest): string {
    const base = `https://${req.courtId}.msudrf.ru/modules.php`;
    const params = new URLSearchParams();
    params.set('name', 'sud_delo');
    params.set('srv_num', '1');
    // Мировые судьи используют другую структуру поиска
    params.set('name_op', 'r');
    params.set('delo_id', '');
    params.set('case_type', '0');
    params.set('new', '0');
    if (req.caseNumber) params.set('g1_case__CASE_NUMBERSS', req.caseNumber);
    params.set('Submit', 'Найти');
    return base + '?' + params.toString();
  }
}
