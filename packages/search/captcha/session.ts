// packages/captcha/session.ts

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import puppeteer, { type Page } from 'puppeteer';
import { isCaptchaPage } from '../core/errors.js';
import { RuCaptchaClient } from './rucaptcha.js';

export interface MagistrateSessionOptions {
  url: string;
  apiKey: string;
  softId?: string;
  debugDir?: string;
}

export async function fetchMagistrateHtml(options: MagistrateSessionOptions): Promise<string> {
  // PUPPETEER_HEADLESS=false  — для локальной диагностики (не пушить .env с этим флагом)
  // 'shell' — старый headless-режим, не создаёт окон (new headless мигает белым на Windows)
  const headless: boolean | 'shell' = process.env['PUPPETEER_HEADLESS'] === 'false' ? false : 'shell';

  const browser = await puppeteer.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-features=NetworkServiceInProcess',
      // msudrf.ru использует wildcard *.msudrf.ru, который не покрывает subdomain.perm.msudrf.ru
      '--ignore-certificate-errors',
    ],
  });
  const page = await browser.newPage();

  try {
    await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    let html = await page.content();
    if (!isCaptchaPage(html)) return html;

    if (options.debugDir) ensureDir(options.debugDir);

    const client = new RuCaptchaClient({ apiKey: options.apiKey, softId: options.softId });
    const imageBase64 = await readCaptchaImageAsBase64(page);
    const captchaText = await client.solveImage(imageBase64);

    await page.locator('input[name="captcha-response"]').fill(captchaText);
    // msudrf: после капчи контент обновляется без полной перезагрузки (AJAX)
    await page.locator('form#kcaptchaForm button[type="submit"]').click();
    await page.waitForNetworkIdle({ timeout: 60000 }).catch(() => {});

    html = await page.content();

    if (options.debugDir) {
      writeFileSync(resolve(options.debugDir, 'magistrate-last.html'), html, 'utf-8');
    }

    if (isCaptchaPage(html)) {
      throw new Error('Captcha loop: после отправки капча показана повторно');
    }

    return html;
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Fetches the captcha image using fetch() in the browser context.
 * Avoids page.goto(imageUrl) + page.goBack() — fragile on msudrf:
 * captcha.php may not be added to history, goBack() can invalidate the token.
 * Browser-context fetch inherits session cookies automatically.
 */
async function readCaptchaImageAsBase64(page: Page): Promise<string> {
  const src = await page.$eval(
    'form#kcaptchaForm img',
    (img: HTMLImageElement) => img.getAttribute('src'),
  );
  if (!src) throw new Error('Captcha image src not found');

  const imageBase64 = await page.evaluate(async (imgSrc: string) => {
    const res = await fetch(imgSrc, { credentials: 'include' });
    if (!res.ok) throw new Error(`Captcha image fetch failed: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, src);

  return imageBase64;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
