// Smoke-тест — проверяет работу адаптеров и справочника
import { DistrictSearchAdapter } from './adapters/district.js';
import { findCourtBySubdomain, getTotalCourts } from './courts.js';
import { hasCaptchaKeys } from './config.js';

async function main() {
  console.log('🧪 CourtSniffer Smoke Test\n');

  // Test 1: district search by case number
  console.log('1️⃣  District: поиск по номеру дела...');
  try {
    const adapter = new DistrictSearchAdapter();
    const results = await adapter.searchByCaseNumber({
      courtId: 'sverdlov--perm',
      courtType: 'district',
      caseNumber: '2-1234/2024',
    });
    if (results.length > 0) {
      console.log(`   ✅ Найдено ${results.length} дел`);
      console.log(`      Первое: ${results[0].caseNumber}`);
      console.log(`      Судья: ${results[0].judge}`);
      console.log(`      Результат: ${results[0].result}`);
      console.log(`      Вступило в силу: ${results[0].legalForceDate}`);
    } else {
      console.log('   ⚠️  Дело не найдено');
    }
  } catch (err) {
    console.log(`   ❌ ${err instanceof Error ? err.message : String(err)}`);
  }

  // Test 2: court directory lookup
  console.log('\n2️⃣  Справочник судов...');
  const court = findCourtBySubdomain('sverdlov--perm');
  console.log(`   Всего: ${getTotalCourts()}`);
  console.log(`   sverdlov--perm: ${court ? court.name + ' (' + court.code + ')' : 'не найден'}`);

  // Test 3: config
  console.log('\n3️⃣  Конфигурация...');
  console.log(`   Ключи RuCaptcha: ${hasCaptchaKeys() ? '✅ есть' : '⚠️  нет'}`);

  console.log('\n✅ Smoke test завершён');
}

main().catch(err => {
  console.error('❌ Критическая ошибка:', err.message);
  process.exit(1);
});
