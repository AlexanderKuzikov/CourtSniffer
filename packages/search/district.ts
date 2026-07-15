// Поиск по районным судам (*.sudrf.ru), апелляции, кассации
// Использует op=sf → op=r (без капчи)

import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import https from 'https';
import type { SearchRequest, SearchResult, CourtType } from './types.js';

const DELO_IDS: Record<string, string> = {
  district: '1540005',
  appeal: '5',
  cassation: '2800001',
};

function buildSearchUrl(req: SearchRequest): string {
  const base = `https://${req.courtId}.sudrf.ru/modules.php`;
  const params = new URLSearchParams();
  params.set('name', 'sud_delo');
  params.set('srv_num', '1');
  params.set('name_op', 'r');
  params.set('delo_id', DELO_IDS[req.courtType] || '1540005');
  params.set('case_type', '0');
  params.set('new', '0');
  if (req.caseNumber) params.set('g1_case__CASE_NUMBERSS', req.caseNumber);
  if (req.defendant) params.set('G1_PARTS__NAMESS', req.defendant);
  if (req.filingDateFrom) params.set('g1_case__ENTRY_DATE1D', req.filingDateFrom);
  if (req.filingDateTo) params.set('g1_case__ENTRY_DATE2D', req.filingDateTo);
  params.set('Submit', 'Найти');
  return base + '?' + params.toString();
}

function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      rejectUnauthorized: false,
      timeout: 15000,
      headers: { 'User-Agent': 'CourtSniffer/0.1' },
    }, res => {
      const chunks: Buffer[] = [];
      const ct = res.headers['content-type'] ?? '';
      const cs = ct.match(/charset=([\w-]+)/i);
      const encoding = (cs && cs[1]?.toLowerCase() === 'utf-8') ? 'utf8' : 'win1251';
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try { resolve(iconv.decode(Buffer.concat(chunks), encoding)); }
        catch { resolve(Buffer.concat(chunks).toString('utf8')); }
      });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

function parseResultsTable(html: string, req: SearchRequest): SearchResult[] {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // Таблица результатов — третья по счёту
  const table = $('table').eq(3);
  if (!table.length) return results;

  // Определяем колонки по заголовку
  const headers: string[] = [];
  table.find('tr').first().find('th').each((_, th) => {
    headers.push($(th).text().replace(/\s+/g, ' ').trim());
  });

  // Парсим строки
  table.find('tr').slice(1).each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;

    const caseLink = cells.eq(0).find('a');
    const caseUrl = caseLink.attr('href') || '';
    const caseNumber = caseLink.text().trim().split(' ')[0] || '';

    results.push({
      caseNumber,
      caseUrl: caseUrl.startsWith('http')
        ? caseUrl
        : `https://${req.courtId}.sudrf.ru${caseUrl}`,
      uid: '',
      judge: cells.eq(3).text().trim() || null,
      result: cells.eq(5).text().trim() || null,
      legalForceDate: cells.eq(6).text().trim() || null,
      filingDate: cells.eq(1).text().trim() || null,
      decisionDate: cells.eq(4).text().trim() || null,
      parties: [],
      courtId: req.courtId,
      courtType: req.courtType,
    });
  });

  return results;
}

export async function searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
  const url = buildSearchUrl(req);
  const html = await fetchHtml(url);
  return parseResultsTable(html, req);
}

export async function searchByParty(req: SearchRequest): Promise<SearchResult[]> {
  const url = buildSearchUrl(req);
  const html = await fetchHtml(url);
  return parseResultsTable(html, req);
}
