#!/usr/bin/env node
// CLI для CourtSniffer

import { searchByCaseNumber, searchByParty } from './district.js';
import type { CourtType } from './types.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      opts[key] = args[i + 1] || '';
      i++;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();

  if (opts.help || !opts.court) {
    console.log(`
CourtSniffer — поиск судебных дел

Использование:
  npm run search:case -- --court <id> --number <номер дела>
  npm run search:party -- --court <id> [--defendant <ФИО>] [--plaintiff <название>]

Параметры:
  --court      ID суда (напр. sverdlov--perm)
  --type       Тип: district | appeal | cassation | magistrate (по умолч. district)
  --number     Номер дела (для поиска по номеру)
  --defendant  ФИО ответчика
  --plaintiff  Наименование истца
  --from       Дата поступления с (ДД.ММ.ГГГГ)
  --to         Дата поступления по (ДД.ММ.ГГГГ)

Примеры:
  # Поиск по номеру дела
  npm run search:case -- --court sverdlov--perm --number 2-1234/2024

  # Поиск по ответчику
  npm run search:party -- --court sverdlov--perm --defendant Кислицин --from 01.10.2023 --to 31.10.2023
`);
    return;
  }

  const courtType = (opts.type || 'district') as CourtType;
  const req = {
    courtId: opts.court,
    courtType,
    caseNumber: opts.number,
    defendant: opts.defendant,
    plaintiff: opts.plaintiff,
    filingDateFrom: opts.from,
    filingDateTo: opts.to,
  };

  let results;
  if (opts.number) {
    console.error(`🔍 Ищем дело ${opts.number} в ${opts.court}…`);
    results = await searchByCaseNumber(req);
  } else {
    console.error(`🔍 Ищем дела по участникам в ${opts.court}…`);
    results = await searchByParty(req);
  }

  if (results.length === 0) {
    console.log(JSON.stringify({ found: false, results: [] }, null, 2));
    return;
  }

  console.log(JSON.stringify({ found: true, count: results.length, results }, null, 2));
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
