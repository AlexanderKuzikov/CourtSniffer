// Мировые суды (*.msudrf.ru) — с капчей через Puppeteer+RuCaptcha
import { encodeParam } from '../encoding.js';
import type { SearchRequest, SearchResult } from '../types.js';
import type { SearchAdapter } from './types.js';
import { getRuCaptchaKey, hasCaptchaKeys } from '../config.js';

export class MagistrateSearchAdapter implements SearchAdapter {
  buildSearchUrl(req: SearchRequest): string {
    const base = `https://${req.courtId}.msudrf.ru/modules.php`;
    const p = new URLSearchParams();
    p.set('name', 'sud_delo'); p.set('srv_num', '1');
    p.set('name_op', 'r'); p.set('delo_id', '');
    p.set('case_type', '0'); p.set('new', '0');
    if (req.caseNumber) p.set('g1_case__CASE_NUMBERSS', req.caseNumber);
    if (req.defendant || req.plaintiff) p.set('G1_PARTS__NAMESS', req.defendant || req.plaintiff || '');
    return base + '?' + p.toString() + '&Submit=%CD%E0%E9%F2%E8';
  }

  async searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
    if (!hasCaptchaKeys()) {
      throw new Error('Для поиска по мировым судам нужен ключ RuCaptcha в .env');
    }
    // TODO: через Puppeteer+RuCaptcha как в CourtFlow
    throw new Error('Поиск по мировым судам требует Puppeteer+RuCaptcha (в разработке)');
  }

  async searchByParty(req: SearchRequest): Promise<SearchResult[]> {
    if (!hasCaptchaKeys()) {
      throw new Error('Для поиска по мировым судам нужен ключ RuCaptcha в .env');
    }
    throw new Error('Поиск по мировым судам требует Puppeteer+RuCaptcha (в разработке)');
  }
}