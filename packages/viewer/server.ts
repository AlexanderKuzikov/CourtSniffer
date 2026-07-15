import express, { type Request, type Response } from 'express';
import { getSearchAdapter } from '../search/adapters/registry.js';
import { findCourtByCodeOrSubdomain, findCourtsByName, getTotalCourts } from '../search/courts.js';
import { hasCaptchaKeys } from '../search/config.js';
import type { CourtType } from '../search/types.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VALID_COURT_TYPES: ReadonlySet<string> = new Set(['district', 'appeal', 'cassation', 'magistrate']);

function isCourtType(v: unknown): v is CourtType {
  return typeof v === 'string' && VALID_COURT_TYPES.has(v);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
}

function checkPort(port: number): Promise<boolean> {
  return new Promise(done => {
    const s = createServer();
    s.once('error', () => done(false));
    s.once('listening', () => { s.close(() => done(true)); });
    s.listen(port, '127.0.0.1');
  });
}

async function findPort(start: number): Promise<number> {
  for (let p = start; p <= start + 20; p++) {
    if (await checkPort(p)) return p;
    console.log(`[viewer] Порт ${p} занят, пробую ${p + 1}…`);
  }
  throw new Error('Нет свободных портов');
}

const app = express();
app.use(express.json());
app.use(express.static(resolve(__dirname, 'public')));

/**
 * Разрешает идентификатор суда (code или subdomain) → subdomain для URL.
 * Возвращает { subdomain, code, name } или null.
 */
function resolveCourtId(id: string): { subdomain: string; code: string; name: string } | null {
  const info = findCourtByCodeOrSubdomain(id);
  if (!info || !info.subdomain) return null;
  return { subdomain: info.subdomain, code: info.code, name: info.name };
}

// API: поиск по номеру дела
app.post('/api/search/case-number', async (req: Request, res: Response) => {
  try {
    const { courtId, courtType, caseNumber } = req.body ?? {};
    if (!courtId || !caseNumber) {
      return res.status(400).json({ error: 'Укажите courtId и caseNumber' });
    }
    const resolved = resolveCourtId(courtId);
    if (!resolved) {
      return res.status(404).json({ error: `Суд "${courtId}" не найден в справочнике` });
    }
    const type: CourtType = isCourtType(courtType) ? courtType : 'district';
    const adapter = getSearchAdapter(type);
    const results = await adapter.searchByCaseNumber({
      courtId: resolved.subdomain,
      courtCode: resolved.code,
      courtType: type,
      caseNumber,
    });
    res.json({
      found: results.length > 0, count: results.length, results,
      court: { code: resolved.code, name: resolved.name },
    });
  } catch (err) {
    console.error('[viewer] search/case-number:', err);
    res.status(500).json({ error: errMsg(err) });
  }
});

// API: поиск по участникам
app.post('/api/search/party', async (req: Request, res: Response) => {
  try {
    const { courtId, courtType, defendant, plaintiff, from, to } = req.body ?? {};
    if (!courtId || (!defendant && !plaintiff)) {
      return res.status(400).json({ error: 'Укажите courtId и defendant/plaintiff' });
    }
    const resolved = resolveCourtId(courtId);
    if (!resolved) {
      return res.status(404).json({ error: `Суд "${courtId}" не найден в справочнике` });
    }
    const type: CourtType = isCourtType(courtType) ? courtType : 'district';
    const adapter = getSearchAdapter(type);
    const results = await adapter.searchByParty({
      courtId: resolved.subdomain,
      courtCode: resolved.code,
      courtType: type, defendant, plaintiff,
      filingDateFrom: from, filingDateTo: to,
    });
    res.json({
      found: results.length > 0, count: results.length, results,
      court: { code: resolved.code, name: resolved.name },
    });
  } catch (err) {
    console.error('[viewer] search/party:', err);
    res.status(500).json({ error: errMsg(err) });
  }
});

// API: поиск суда
app.get('/api/courts', (req: Request, res: Response) => {
  const q = req.query.q;
  if (q && typeof q === 'string') res.json(findCourtsByName(q).slice(0, 30));
  else res.json({ total: getTotalCourts(), captcha: hasCaptchaKeys() });
});

// API: инфо о суде (по code или subdomain)
app.get('/api/courts/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const court = findCourtByCodeOrSubdomain(id);
  if (!court) return res.status(404).json({ error: 'Суд не найден' });
  res.json(court);
});

// Запуск
const port = await findPort(8765);
app.listen(port, '127.0.0.1', () => {
  console.log(`[viewer] CourtSniffer UI: http://127.0.0.1:${port}`);
});
