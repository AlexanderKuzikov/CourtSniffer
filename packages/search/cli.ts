#!/usr/bin/env node
// CourtSniffer CLI

import { getSearchAdapter } from './adapters/registry.js';
import { findCourtBySubdomain, findCourtsByName } from './courts.js';
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
    console.log(`CourtSniffer v0.1.0 — поиск судебных дел на сайтах РФ

Использование:
  npm run search:case -- --court <id> --number <номер>
  npm run search:party -- --court <id> --defendant <ФИО> [--from ДД.ММ.ГГГГ --to ДД.ММ.ГГГГ]
  npm run search -- --court <id> --defendant <ФИО> --from ... --to ...
  npm run search:party -- --court <id> --plaintiff <назв.> --from ... --to ...

Параметры:
  --court      ID суда (напр. sverdlov--perm)
  --type       district | appeal | cassation | magistrate (по умолч. district)
  --number     Номер дела
  --defendant  ФИО ответчика
  --plaintiff  Наименование истца
  --from       Дата поступления с (ДД.ММ.ГГГГ)
  --to         Дата поступления по (ДД.ММ.ГГГГ)
  --list       Список судов по названию

Примеры:
  npm run search:case -- --court sverdlov--perm --number 2-1234/2024
  npm run search:party -- --court sverdlov--perm --defendant Кислицин
  npm run search:party -- --court 6.perm --type magistrate --number 2-586/2026
  npm run search -- --list миров
`);
    return;
  }

  // Список судов
  if (opts.list) {
    const list = findCourtsByName(opts.list);
    console.log(JSON.stringify(list.slice(0, 30), null, 2));
    return;
  }

  const courtType = (opts.type || 'district') as CourtType;
  const courtInfo = findCourtBySubdomain(opts.court);
  if (!courtInfo) {
    console.error(`⚠️  Суд с ID "${opts.court}" не найден в справочнике.`);
    console.error('   Используй --list для поиска суда по названию');
    console.error('   Например: npm run search -- --list свердловский');
  }

  const adapter = getSearchAdapter(courtType);
  const req = {
    courtId: opts.court,
    courtType,
    caseNumber: opts.number,
    defendant: opts.defendant,
    plaintiff: opts.plaintiff,
    filingDateFrom: opts.from,
    filingDateTo: opts.to,
  };

  try {
    let results: any[];
    if (opts.number) {
      console.error(`🔍 Поиск дела ${opts.number} в ${opts.court}…`);
      results = await adapter.searchByCaseNumber(req);
    } else if (opts.defendant || opts.plaintiff) {
      console.error(`🔍 Поиск по участникам в ${opts.court}…`);
      results = await adapter.searchByParty(req);
    } else {
      console.error('Укажите --number или --defendant');
      process.exit(1);
    }

    console.log(JSON.stringify({
      found: results.length > 0,
      count: results.length,
      results,
      courtInfo: courtInfo ? { name: courtInfo.name, code: courtInfo.code, region: courtInfo.region } : null,
    }, null, 2));

    if (results.length === 0) {
      console.error('😕 Ничего не найдено');
    }
  } catch (err) {
    console.error('❌ Ошибка:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Ошибка:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
