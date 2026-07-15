import express from 'express';
import { getSearchAdapter } from '../search/adapters/registry.js';
import { findCourtBySubdomain, findCourtsByName, getTotalCourts } from '../search/courts.js';
import { hasCaptchaKeys } from '../search/config.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'net';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function checkPort(port) {
  return new Promise(resolve => {
    const s = createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(() => resolve(true)); });
    s.listen(port, '127.0.0.1');
  });
}

async function findPort(start) {
  for (let p = start; p <= start + 20; p++) {
    if (await checkPort(p)) return p;
    console.log(`[viewer] Порт ${p} занят, пробую ${p + 1}…`);
  }
  throw new Error('Нет свободных портов');
}

const app = express();
app.use(express.json());
app.use(express.static(resolve(__dirname, 'public')));

// API: поиск по номеру дела
app.post('/api/search/case-number', async (req, res) => {
  try {
    const { courtId, courtType, caseNumber } = req.body || {};
    if (!courtId || !caseNumber) return res.status(400).json({ error: 'Укажите courtId и caseNumber' });
    const adapter = getSearchAdapter(courtType || 'district');
    const results = await adapter.searchByCaseNumber({ courtId, courtType: courtType || 'district', caseNumber });
    res.json({ found: results.length > 0, count: results.length, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: поиск по участникам
app.post('/api/search/party', async (req, res) => {
  try {
    const { courtId, courtType, defendant, plaintiff, from, to } = req.body || {};
    if (!courtId || (!defendant && !plaintiff)) return res.status(400).json({ error: 'Укажите courtId и defendant/plaintiff' });
    const adapter = getSearchAdapter(courtType || 'district');
    const results = await adapter.searchByParty({ courtId, courtType: courtType || 'district', defendant, plaintiff, filingDateFrom: from, filingDateTo: to });
    res.json({ found: results.length > 0, count: results.length, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: поиск суда
app.get('/api/courts', (req, res) => {
  const q = req.query.q;
  if (q) res.json(findCourtsByName(q).slice(0, 30));
  else res.json({ total: getTotalCourts(), captcha: hasCaptchaKeys() });
});

// API: инфо о суде
app.get('/api/courts/:subdomain', (req, res) => {
  const court = findCourtBySubdomain(req.params.subdomain);
  if (!court) return res.status(404).json({ error: 'Суд не найден' });
  res.json(court);
});

// Запуск
const port = await findPort(8765);
app.listen(port, '127.0.0.1', () => {
  console.log(`[viewer] CourtSniffer UI: http://127.0.0.1:${port}`);
});
