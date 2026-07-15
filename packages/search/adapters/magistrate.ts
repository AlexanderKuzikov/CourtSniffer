// Мировые суды (*.msudrf.ru) — с капчей через Puppeteer+RuCaptcha
//
// msudrf ставит капчу на любой запрос к modules.php.
// Стратегия: решаем капчу один раз на op=hl (список дел),
// затем в той же сессии делаем page.goto с поисковыми параметрами.
//
// Параметры поиска — те же, что в district (CP1251 encoding):
//   name=sud_delo, srv_num=1, name_op=r, delo_id=1540005
//   g1_case__CASE_NUMBERSS, G1_PARTS__NAMESS (через encodeParam)

import * as cheerio from 'cheerio';
import { isCaptchaPage } from '../core/errors.js';
import { getRuCaptchaKey } from '../config.js';
import { encodeParam } from '../encoding.js';
import type { SearchRequest, SearchResult } from '../types.js';
import type { SearchAdapter } from './types.js';

/**
 * Парсинг таблицы результатов msudrf (формат ГАС «Правосудие»).
 * Колонки: № дела | Дата поступления | Категория | Судья | Дата решения | Результат | Вступление в силу
 */
function parseResults(html: string, req: SearchRequest): SearchResult[] {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // Ищем таблицу результатов — обычно содержит "№ дела"
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
      caseUrl: href.startsWith('http') ? href : `https://${req.courtId}.msudrf.ru${href}`,
      uid: uidMatch ? uidMatch[1] : '',
      courtCode: req.courtCode,
      judge: cells.eq(3).text().trim() || null,
      result: cells.eq(5).text().trim() || null,
      legalForceDate: cells.eq(6).text().trim() || null,
      filingDate: cells.eq(1).text().trim() || null,
      decisionDate: cells.eq(4).text().trim() || null,
      parties: [],
      courtId: req.courtId,
      courtType: 'magistrate',
    });
  });
  return results;
}

/**
 * Сессионный браузер для msudrf — решает капчу один раз,
 * затем выполняет поисковые запросы в той же сессии.
 */
async function createMagistrateSession(apiKey: string) {
  const { default: puppeteer } = await import('puppeteer');
  const { RuCaptchaClient } = await import('../captcha/rucaptcha.js');

  const browser = await puppeteer.launch({
    headless: (process.env['PUPPETEER_HEADLESS'] === 'false' ? false : 'shell') as boolean | 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  // Решаем капчу на странице списка дел (op=hl)
  await page.goto(`https://${page.url().includes('msudrf') ? '' : '35.perm'}.msudrf.ru`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  // На самом деле, просто переходим на нужный URL
  return { browser, page };
}

async function solveCaptchaOnPage(page: any, apiKey: string): Promise<void> {
  const { RuCaptchaClient } = await import('../captcha/rucaptcha.js');

  const src = await page.$eval(
    'form#kcaptchaForm img',
    (img: HTMLImageElement) => img.getAttribute('src'),
  );
  const imageBase64 = await page.evaluate(async (imgSrc: string) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 60000);
    const res = await fetch(imgSrc, { credentials: 'include', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }, src);

  const client = new RuCaptchaClient({ apiKey, pollingIntervalMs: 5000, timeoutMs: 120000 });
  const captchaText = await client.solveImage(imageBase64);

  await page.locator('input[name="captcha-response"]').fill(captchaText);
  await page.locator('form#kcaptchaForm button[type="submit"]').click();
  await page.waitForNetworkIdle({ timeout: 60000 }).catch(() => {});
}

export class MagistrateSearchAdapter implements SearchAdapter {
  buildSearchUrl(req: SearchRequest): string {
    const base = `https://${req.courtId}.msudrf.ru/modules.php`;
    const q = [
      'name=sud_delo', 'srv_num=1',
      'name_op=r', 'delo_id=1540005', 'case_type=0', 'new=0',
      'G1_PARTS__NAMESS=' + encodeParam(req.defendant || req.plaintiff || ''),
      'g1_case__CASE_NUMBERSS=' + encodeURIComponent(req.caseNumber || ''),
      'Submit=%CD%E0%E9%F2%E8',
    ];
    return base + '?' + q.join('&');
  }

  async searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]> {
    const apiKey = getRuCaptchaKey();
    if (!apiKey) {
      throw new Error('Для мировых судов нужен ключ RuCaptcha в .env');
    }

    // Парсинг по URL дела — прямой сценарий
    if (req.caseNumber && req.caseNumber.startsWith('http')) {
      const { fetchMagistrateHtml } = await import('../captcha/session.js');
      const html = await fetchMagistrateHtml({ url: req.caseNumber, apiKey, debugDir: 'captcha-debug' });
      if (isCaptchaPage(html)) {
        throw new Error('Captcha loop: не удалось загрузить страницу дела');
      }
      const $ = cheerio.load(html);
      // Парсинг карточки дела через tab-content
      const rawCard: Record<string, string> = {};
      $('.tab-content').first().find('table.tablcont tr').each((_, el) => {
        const tds = $(el).find('td');
        if (tds.length < 2) return;
        const key = tds.eq(0).text().trim().replace(/:$/, '');
        const value = tds.eq(1).text().trim();
        if (key) rawCard[key] = value;
      });
      const caseNumber = $('h2').filter((_, el) => $(el).text().includes('ДЕЛО №'))
        .first().text().replace(/ДЕЛО\s*№/i, '').trim() || '';
      let uid = '';
      $('a[href*="case_uid"]').first().each((_, el) => {
        const m = $(el).attr('href')?.match(/case_uid=([a-f0-9-]+)/i);
        if (m) uid = m[1];
      });
      const events: Array<{ date: string }> = [];
      $('.tab-content').eq(1).find('table.tablcont tr').slice(2).each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 4) return;
        events.push({ date: tds.eq(1).text().trim() });
      });
      return [{
        caseNumber,
        caseUrl: req.caseNumber,
        uid,
        courtCode: req.courtCode,
        judge: rawCard['Председательствующий судья'] || null,
        result: rawCard['Результат рассмотрения'] || null,
        legalForceDate: rawCard['Дело рассмотрено (выдан приказ)'] || null,
        filingDate: events[0]?.date || null,
        decisionDate: rawCard['Дело рассмотрено (выдан приказ)'] || null,
        parties: [],
        courtId: req.courtId,
        courtType: 'magistrate',
      }];
    }

    // Поиск по номеру — через браузерную сессию (капча решается один раз)
    const { default: puppeteer } = await import('puppeteer');
    const { RuCaptchaClient } = await import('../captcha/rucaptcha.js');
    const browser = await puppeteer.launch({
      headless: (process.env['PUPPETEER_HEADLESS'] === 'false' ? false : 'shell') as boolean | 'shell',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    try {
      // Шаг 1: Открываем страницу списка дел (может потребовать капчу)
      await page.goto(`https://${req.courtId}.msudrf.ru/modules.php?name=sud_delo&op=hl`, {
        waitUntil: 'domcontentloaded', timeout: 30000,
      });
      let html = await page.content();
      if (isCaptchaPage(html)) {
        await solveCaptchaOnPage(page, apiKey);
        html = await page.content();
      }

      // Шаг 2: Переходим на URL поиска (та же сессия, куки сохраняются)
      const searchUrl = this.buildSearchUrl(req);
      console.error(`[magistrate] поиск: ${searchUrl.slice(0, 150)}...`);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      html = await page.content();
      if (isCaptchaPage(html)) {
        // Если снова капча — решаем ещё раз
        await solveCaptchaOnPage(page, apiKey);
        html = await page.content();
      }

      return parseResults(html, req);
    } finally {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }

  async searchByParty(req: SearchRequest): Promise<SearchResult[]> {
    // Поиск по участникам использует тот же механизм (buildSearchUrl с G1_PARTS__NAMESS)
    return this.searchByCaseNumber(req);
  }
}
