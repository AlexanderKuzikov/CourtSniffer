// Кассационные суды (*kas.sudrf.ru) — без капчи
// delo_id=2800001 — кассационные дела
// op=sf → op=r

import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import https from 'https';
import { encodeParam } from '../encoding.js';
import type { SearchRequest, SearchResult } from '../types.js';
import type { SearchAdapter } from './types.js';

function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search,
      rejectUnauthorized: false, timeout: 15000,
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

function parseResults(html: string, req: SearchRequest): SearchResult[] {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  const table = $('table').filter((_, t) => $(t).text().includes('№ дела')).first();
  if (!table.length) return results;
  table.find('tr').slice(1).each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return;
    const link = cells.eq(0).find('a');
    const href = link.attr('href') || '';
    const num = link.text().trim().split(/\s+/)[0] || '';
    const uidMatch = href.match(/case_uid=([a-f0-9-]+)/i);
    results.push({
      caseNumber: num,
      caseUrl: href.startsWith('http') ? href : `https://${req.courtId}.sudrf.ru${href}`,
      uid: uidMatch ? uidMatch[1] : '',
      judge: cells.eq(3).text().trim() || null,
      result: cells.eq(5).text().trim() || null,
      legalForceDate: cells.eq(6).text().trim() || null,
      filingDate: cells.eq(1).text().trim() || null,
      decisionDate: cells.eq(4).text().trim() || null,
      parties: [], courtId: req.courtId, courtType: req.courtType,
    });
  });
  return results;
}

export class CassationSearchAdapter implements SearchAdapter {
  buildSearchUrl(req: SearchRequest): string {
    const base = `https://${req.courtId}.sudrf.ru/modules.php`;
    const q = [
      'name=sud_delo', 'srv_num=1',
      'name_op=r', 'delo_id=2800001', 'case_type=4', 'new=0',
      'G1_PARTS__NAMESS=' + encodeParam(req.defendant || req.plaintiff || ''),
      'g1_case__CASE_NUMBERSS=' + encodeURIComponent(req.caseNumber || ''),
      'g1_case__JUDICIAL_UIDSS=', 'delo_table=g1_case',
      'g1_case__ENTRY_DATE1D=' + encodeURIComponent(req.filingDateFrom || ''),
      'g1_case__ENTRY_DATE2D=' + encodeURIComponent(req.filingDateTo || ''),
      'G1_CASE__JUDGE=', 'g1_case__RESULT_DATE1D=', 'g1_case__RESULT_DATE2D=',
      'G1_CASE__RESULT=', 'G1_CASE__BUILDING_ID=', 'G1_CASE__COURT_STRUCT=',
      'G1_EVENT__EVENT_NAME=', 'G1_EVENT__EVENT_DATEDD=',
      'G1_PARTS__PARTS_TYPE=', 'G1_PARTS__INN_STRSS=', 'G1_PARTS__KPP_STRSS=',
      'G1_PARTS__OGRN_STRSS=', 'G1_PARTS__OGRNIP_STRSS=',
      'G1_RKN_ACCESS_RESTRICTION__RKN_REASON=', 'g1_rkn_access_restriction__RKN_RESTRICT_URLSS=',
      'g1_requirement__ACCESSION_DATE1D=', 'g1_requirement__ACCESSION_DATE2D=',
      'G1_REQUIREMENT__CATEGORY=', 'g1_requirement__ESSENCESS=',
      'g1_requirement__JOIN_END_DATE1D=', 'g1_requirement__JOIN_END_DATE2D=',
      'G1_REQUIREMENT__PUBLICATION_ID=',
      'G1_DOCUMENT__PUBL_DATE1D=', 'G1_DOCUMENT__PUBL_DATE2D=',
      'G1_CASE__VALIDITY_DATE1D=', 'G1_CASE__VALIDITY_DATE2D=',
      'G1_ORDER_INFO__ORDER_DATE1D=', 'G1_ORDER_INFO__ORDER_DATE2D=',
      'G1_ORDER_INFO__ORDER_NUMSS=', 'G1_ORDER_INFO__EXTERNALKEYSS=',
      'G1_ORDER_INFO__STATE_ID=', 'G1_ORDER_INFO__RECIP_ID=',
      'Submit=%CD%E0%E9%F2%E8',
    ];
    return base + '?' + q.join('&');
  }
  async searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
    return parseResults(await fetchHtml(this.buildSearchUrl(req)), req);
  }
  async searchByParty(req: SearchRequest): Promise<SearchResult[]> {
    return parseResults(await fetchHtml(this.buildSearchUrl(req)), req);
  }
}