#!/usr/bin/env node
// CLI для CourtSniffer

import { getSearchAdapter } from './adapters/registry.js';
import { findCourtBySubdomain } from './courts.js';
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
  npm run search:case -- --court sverdlov--perm --number 2-1234/2024
  npm run search:party -- --court sverdlov--perm --defendant Кислицин --from 01.10.2023 --to 31.10.2023
`);
    return;
  }

  const courtType = (opts.type || 'district') as CourtType;
  
  // Lookup court info from directory
  const courtInfo = findCourtBySubdomain(opts.court);
  const effectiveType = courtType;
  
  const adapter = getSearchAdapter(effectiveType);
  const req = {
    courtId: opts.court,
    courtType: effectiveType,
    caseNumber: opts.number,
    defendant: opts.defendant,
    plaintiff: opts.plaintiff,
    filingDateFrom: opts.from,
    filingDateTo: opts.to,
  };

  try {
    let results;
    if (opts.number) {
      console.error(`🔍 Ищем дело ${opts.number} в ${opts.court}…`);
      results = await adapter.searchByCaseNumber(req);
    } else if (opts.defendant || opts.plaintiff) {
      console.error(`🔍 Ищем дела по участникам в ${opts.court}…`);
      results = await adapter.searchByParty(req);
    } else {
      console.error('Укажите --number или --defendant');
      process.exit(1);
    }

    console.log(JSON.stringify({
      found: results.length > 0,
      count: results.length,
      results,
      courtInfo: courtInfo ? {
        name: courtInfo.name,
        code: courtInfo.code,
        region: courtInfo.region,
      } : null,
    }, null, 2));
  } catch (err) {
    console.error('Ошибка:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
