# Code Review — CourtSniffer

> Ревью от 2026-07-15. Ревизия: `d62795a` (HEAD).
> Замечания по `packages/viewer/` помечены **[UI WIP]** — UI в активной разработке, замечания фиксируются как паттерн, не как блокеры релиза.

---

## Вердикт

**НУЖНЫ ПРАВКИ** — есть 1 блокер (XSS в UI) + несколько важных (отсутствие LICENSE, устаревший бейдж тестов, падение без `.env`, небрежная обработка ненайденного суда в CLI).

**Суть:** Проект с хорошей архитектурной задумкой (адаптеры + registry + barrel + ADR) и реальной domain-экспертизой по sudrf.ru/CP1251/captcha. Адаптеры разделены осознанно (требование расширяемости — каждый тип суда развивается независимо). Тесты проводились агентом Goose (в `.goose/`), артефакты удалены — бейдж `35_passing` устарел. UI содержит XSS, LICENSE отсутствует.

---

## Оценка уровня

### Как разработчик: **Middle+ / Senior−**

Сильные стороны кода:
- Владение спецификой стека: CP1251-энкодинг для legacy PHP-форм (`encoding.ts`), `delo_id` по типам судов, разница `case_type` (0/1/4), browser-context `fetch` для капчи вместо `goto/goback` (изящное решение проблемы инвалидации токена в `session.ts:74`).
- Чистые TypeScript-интерфейсы (`types.ts`, `adapters/types.ts`), barrel-экспорты (`index.ts`), осмысленное `import type`.
- Понимание кодировок на байтовом уровне (`encoding.ts:11-22` — ручной percent-encoding по CP1251-байтам, т.к. `URLSearchParams` всегда UTF-8).

Слабые стороны:
- Падение `process.loadEnvFile` без try/catch — запуск «по README» упадёт, если юзер забыл `cp .env.example .env`.
- CLI продолжает работу после `findCourtBySubdomain → null` без `return`/`exit` (`cli.ts:60-65`).
- `rejectUnauthorized: false` без комментария-обоснования в коде.

> Примечание: `fetchHtml`/`parseResults` дублируются в 3 адаптерах — это **осознанное решение** (требование расширяемости: каждый тип суда развивается независимо, без связывания через базовый класс). Trade-off: выше стоимость добавления нового типа суда, но ниже риск регрессии соседних адаптеров. Принято как архитектурное, не замечание.

### Как архитектор: **Middle с хорошим чутьём**

Сильные стороны:
- Паттерн **Strategy + Factory**: `SearchAdapter` интерфейс + `registry.getSearchAdapter(courtType)` — классика, расширяема.
- **ADR-дисциплина**: `CONTEXT.md` (статус/журнал/TODO) + `DECISIONS.md` (решения с датами и обоснованием) — редкая практика даже у senior.
- Разделение `packages/search` (ядро) и `packages/viewer` (UI) — правильный seam.
- Осознанный рефакторинг `3582cb5`: выкинул 103k строк prefix-JSON в пользу одного `courts.json` — упрощение, не накопление.
- Совместимый слой `core/errors.ts` для CourtFlow-модулей — думает о границах систем.

Слабые стороны:
- Не вынесен базовый класс `BaseSudrfAdapter` — 3 адаптера делят ~80% кода. **Однако это осознанный trade-off** (см. выше): независимость адаптеров ценой дубликации. Не замечание, а замеченный trade-off.
- `courts.ts:29-31` — 4.7 MB JSON синхронно грузится на верхнем уровне модуля + `findCourtBySubdomain` делает O(n) linear scan с regex на каждой записи. Нет индекса `Map<subdomain, CourtInfo>`. Файл вырастет незначительно, но O(n)-lookup на 10225 записей в viewer на каждый запрос — избыточно.
- `core/errors.ts` — тонкая плёнка совместимости, но `isCaptchaPage(page: any)` с именем `page` для HTML-строки — утечка терминологии из Puppeteer в доменный слой.
- `tsconfig.noImplicitThis: false` — ослабление `strict` ради `this.destroy()` в timeout-handler. Можно было решить arrow/типизацией, не ослабляя глобально.

### Общий вердикт по уровню
Крепкий middle с потенциалом в архитекторы: структурное мышление есть (адаптеры, seams, ADR), но дисциплина исполнения хромает (дубликация, тесты, edge-cases). По российской шкале — ~2-4 года опыта, знание домена выше среднего.

---

## Плюсы

1. **ADR + CONTEXT.md** — решения зафиксированы с датами и обоснованием (`DECISIONS.md`, `CONTEXT.md`). Это уровень зрелости, редко встречающийся у middle.
2. **Domain-экспертиза** — понимание `delo_id`, `case_type`, CP1251 в URL, специфики `*.sudrf.ru` vs `*.msudrf.ru`, капчи через browser-fetch. Не «код ради кода», а работа с реальным legacy.
3. **`encoding.ts`** — корректный ручной percent-encoder для CP1251, обходит ограничение `URLSearchParams` (UTF-8 only). Чисто, 24 строки, без over-engineering.
4. **`captcha/session.ts:74-94`** — `readCaptchaImageAsBase64` через `page.evaluate(fetch)` с `credentials:'include'` вместо `goto/imgUrl + goBack`. Решает реальную проблему инвалидации captcha-токена в истории. Комментарий объясняет почему.
5. **Интерфейс `SearchAdapter`** — минимальный, 3 метода, легко тестировать и мокать.
6. **Barrel `index.ts`** — чистый публичный API пакета.
7. **Рефакторинг `3582cb5`** — удаление 103k строк prefix-JSON в пользу `courts.json`. Упрощение, а не накопление.
8. **`.gitignore`** корректный: `.env`, `.env.*`, `!.env.example`, `node_modules/`, `.goose/`.
9. **Секреты вне VCS** — `.env` не в git (проверено `git log --all -S`), `.env.example` с пустыми значениями.

---

## Минусы

1. **Дубликация адаптеров** — `fetchHtml`/`parseResults` копипастнуты в `district.ts:12-64`, `appeal.ts:12-56`, `cassation.ts:12-56`. Отличаются только `delo_id`, `case_type`, извлечением `uid`. Нужен `BaseSudrfAdapter`.
2. **Тестов нет** — `vitest` в devDeps, `"test": "vitest run"` в scripts, но 0 test-файлов и нет `vitest.config`. `npm test` скажет «no test files» или упадёт.
3. **Ложный бейдж** `Tests-35_passing` в `README.md:8` — вводит в заблуждение.
4. **Нет LICENSE-файла** — `package.json` и README заявляют Apache-2.0, но файла `LICENSE` нет. Юридически проект не имеет валидной лицензии.
5. **`process.loadEnvFile` без try/catch** (`config.ts:4`) — бросает `ENOENT` если `.env` отсутствует. Любой запуск без `.env` падает до первого import.
6. **CLI: нет выхода при ненайденном суде** (`cli.ts:60-65`) — выводит warning в `console.error`, но продолжает искать через adapter с несуществующим `courtId`.
7. **O(n) lookup без индекса** (`courts.ts:72-87`) — `findCourtBySubdomain` перебирает 10225 записей с regex на каждой. Нет `Map<subdomain, CourtInfo>`.
8. **`rejectUnauthorized: false`** (`district.ts:18`, `appeal.ts:16`, `cassation.ts:16`) — отключает TLS-верификацию. Вынуждено для самоподписанных sudrf.ru, но без комментария в коде и без опции-переключателя.
9. **XSS в UI** (`viewer/public/index.html`, `openDetail`) — `onclick="openDetail('${r.caseNumber}', '${r.caseUrl}', '${r.uid}')"` вставляет значения в одинарные кавычки без экранирования. `esc()` экранирует только `&<>`, не `'`/`"`. Злоумышленный `caseNumber` вида `');alert(1);//` — XSS. Данные приходят с sudrf.ru, но trust boundary нарушена.
10. **`uid: ''` в appeal/cassation** (`appeal.ts:47`, `cassation.ts:47`) — не извлекается `case_uid`, хотя district извлекает (`district.ts:48`). UI использует `uid` как ключ в `allResults.find(x => x.uid === uid)` — для appeal/cassation детализация сломается.

---

## Замечания по осям

### Блокеры

- **[UI WIP] `packages/viewer/public/index.html` — XSS через `onclick`**
  `renderResults()` генерирует `onclick="openDetail('${r.caseNumber}', '${r.caseUrl}', '${r.uid}')"`. Ни `caseNumber`, ни `caseUrl` не экранируются для контекста JS-строки в HTML-атрибуте. Функция `esc()` экранирует только `&<>`, не кавычки.
  **Исправление:** либо `esc()` должен экранировать `'`/`"`/обратный слеш, либо строить обработчики через `addEventListener` + `data-*` атрибуты (рекомендую — чище и не зависит от глобальных функций).
  *UI в работе, но паттерн нужно зафиксировать сейчас — иначе разнесётся по всему файлу.*

### Важно

- **`config.ts:4` — `process.loadEnvFile` бросает ENOENT без `.env`**
  Подтверждено: `process.loadEnvFile('nonexistent.env')` → `THROWS: ENOENT`. README говорит `cp .env.example .env`, но если юзер забыл — падение с непонятной ошибкой на этапе import.
  **Исправление:** `try { process.loadEnvFile(...) } catch { /* .env опционален */ }`.

- **`cli.ts:60-65` — нет выхода при ненайденном суде**
  После `if (!courtInfo)` выводится warning, но нет `return`/`process.exit(1)`. Код идёт дальше, вызывает `getSearchAdapter` + `searchByCaseNumber` с `courtId`, которого нет в справочнике. Запрос уйдёт к несуществующему/чужому домену.
  **Исправление:** добавить `process.exit(1)` или `return` после warning.

- **`README.md:8` — устаревший бейдж `Tests-35_passing`**
  Тесты проводились агентом Goose (в `.goose/`), артефакты удалены — сейчас test-файлов в репо нет. Бейдж соответствует прошлому состоянию. Либо обновить бейдж, либо вернуть тесты в репо (vitest в deps).

- **Отсутствует файл `LICENSE`**
  `package.json: "license": "Apache-2.0"` + `README.md` бейдж, но файла нет. Без файла лицензии проект формально «all rights reserved». Добавить полный текст Apache-2.0.

- **`courts.ts:72-87` — O(n) lookup без индекса**
  `findCourtBySubdomain` перебирает 10225 записей, вызывая `extractSubdomain` (regex) на каждой. Вызывается в viewer на каждый `/api/courts/:subdomain` и в CLI.
  **Исправление:** построить `Map<string, CourtInfo>` один раз при загрузке модуля (после `entries`). Аналогично для `findCourtByCode` — `Map<code, CourtInfo>`. `findCourtsByName` оставить filter (текстовый поиск).

- **`appeal.ts:47`, `cassation.ts:47` — `uid: ''` всегда пустой**
  district извлекает `case_uid` через regex (`district.ts:48`), appeal/cassation — нет. UI `openDetail` использует `uid` как ключ (`allResults.find(x => x.uid === uid)`) — для appeal/cassation детализация не откроется (найдёт первый элемент с `uid===''`).
  **Исправление:** добавить извлечение `case_uid` в parse-логику appeal/cassation (структура таблицы одинаковая, regex тот же). *Независимо от архитектурного решения про дубликацию адаптеров — это баг parse-логики.*

- **`caseUrl` для appeal/cassation — возможен неверный домен**
  `appeal.ts:46`, `cassation.ts:46`: `https://${req.courtId}.sudrf.ru${href}`. Но cassation-суды на `*.kas.sudrf.ru`, appeal на `*oblsud--*.sudrf.ru`. Если `courtId` уже содержит `kas`/`oblsud` — OK, если нет — битый URL. Нужно проверить, что `extractSubdomain` в `courts.ts:54-66` корректно отдаёт `courtId` с нужным префиксом. Если нет — ссылки на дела будут битые. **Требует верификации на реальном cassation-суде.**

### Советы

- **`courts.ts:29-31` — синхронная загрузка 4.7 MB JSON на верхнем уровне модуля**
  `JSON.parse(readFileSync(COURTS_PATH))` блокирует event loop при первом import. Для CLI/smoke — незаметно. Для viewer-сервера — задержка старта ~50-100ms. Приемлемо, но если файл вырастет — вынести в lazy-init с `Map`-кэшем.

- **`core/errors.ts:10` — `isCaptchaPage(page: any)`**
  Имя `page` подразумевает Puppeteer Page, но это HTML-строка. Переименовать в `html`, убрать `any` → `string`. Также `page.includes('captcha')` — слишком широко (любое упоминание слова «captcha» в тексте дела даст false positive). Уточнить до `'kcaptchaForm'` или `'id="captcha'`.

- **`tsconfig.json:7` — `noImplicitThis: false`**
  Ослабление `strict` ради `this.destroy()` в timeout-handler (`district.ts:31` и др.). Решается типизацией хендлера или arrow-обёрткой без ослабления глобально.

- **`viewer/server.ts:12-19` — `checkPort` параметр `resolve` затеняет импорт**
  `import { resolve } from 'path'` используется выше, но `checkPort` объявляет `return new Promise(resolve => ...)` — затенение. Работает (порядок вызовов), но сбивает с толку. Переименовать в `done`/`ok`.

- **`viewer/server.ts:41,52` — `err.message` в HTTP 500**
  Утечка внутренних ошибок клиенту. Для локального UI допустимо, но в прод-паттерн — generic message + server-side лог.

- **`viewer/server.ts:38` — `courtType` из `req.body` не валидируется**
  `getSearchAdapter(courtType || 'district')` — если пришла строка не из `CourtType`, упадёт с `Нет адаптера для типа суда: <строка>`. Не инъекция (switch на enum), но стоит валидировать на границе.

- **`district.ts:31` (и аналоги) — `.on('timeout', function() { this.destroy() ...})`**
  После `destroy` сокет не закрывает res — `reject` сработает, но chunks/res не очищаются явно. На высоких нагрузках возможна утечка. Низкий приоритет (CLI/low-traffic).

- **`cli.ts:79` — `let results: any[]`**
  `any[]` теряет типизацию. `SearchResult[]` — интерфейс уже есть.

- **`CONTEXT.md:64` — `(current)` вместо хэша коммита**
  Журнал работ не обновлён после `d62795a` (feat(ui)). Поддерживать актуальность.

- **`magistrate.ts:16` — `URLSearchParams` для msudrf**
  Использует `URLSearchParams` (UTF-8), тогда как district/appeal/cassation используют `encodeParam` (CP1251). Если msudrf тоже CP1251 — будет та же бага, что была в party-search до fix `38e474a`. Учесть при реализации.

---

## Что хорошо

- **Комментарии объясняют «почему», а не «что»** — `encoding.ts:1-3`, `session.ts:68-73`, `district.ts:68` («PHP-форма ожидает ВСЕ поля»). Это уровень выше среднего.
- **`DECISIONS.md` с таблицей `delo_id`** — краткая,_dense, без воды. Хороший формат для ADR-справочника.
- **Обработка кодировок адаптивная** — `fetchHtml` определяет `utf-8` vs `win1251` по `Content-Type` заголовку, с fallback на win1251. Не хардкод.
- **`captcha/rucaptcha.ts`** — чистый клиент API v2 (createTask/getTaskResult), с timeout, polling, типизированными ответами. Не legacy `/in.php`. Комментарий предупреждает о legacy.
- **Smoke-тест** (`smoke.ts`) — хоть и не unit-тест, но проверяет реальный end-to-end путь. Лучше, чем ничего.
- **Структура каталогов** — `adapters/`, `captcha/`, `core/`, `data/` — логичная, без излишней вложенности.

---

## Проверено

- **Тесты:** Test-файлов в репо нет (проводились агентом Goose в `.goose/`, артефакты удалены). `vitest.config` отсутствует. `npm test` не запускался. Бейдж `35_passing` — устарел (соответствовал прошлому состоянию).
- **Безопасность:**
  - Секреты: `.env` не в VCS (проверено `git log --all -S 'RUCAPTCHA_API_KEY='` — пусто). `.gitignore` корректен. ✅
  - XSS в UI: найден (блокер). ❌
  - TLS: `rejectUnauthorized: false` — вынуждено, но недокументировано. ⚠️
  - Инъекции: SQL/командных инъекций нет (нет SQL/shell). `execSync` импортирован в `viewer/server.ts:8` но не используется — удалить.
- **Сборка:** `typescript@7.0.2` установлен и работает (проверено: `npm view typescript` содержит 7.0.1-rc, 7.0.2, dev-сборки 7.1.0). `process.loadEnvFile` требует Node 21+, README заявляет Node 24+ — консистентно.
- **Git:** 7 коммитов, чистая история, conventional-commits (`feat:`, `fix:`, `refactor:`, `docs:`). Автор — `AlexanderKuzikov`. Репозиторий на GitHub, remote настроен.

---

## Рекомендуемые приоритеты (по убыванию)

1. **XSS в UI** — экранирование кавычек в `esc()` или `data-*` + `addEventListener`. [UI WIP — сделать до «закрытия» UI]
2. **`process.loadEnvFile` try/catch** — 2 строки, делает запуск устойчивым.
3. **CLI `return` после ненайденного суда** — 1 строка.
4. **LICENSE файл** — скопировать Apache-2.0 full text.
5. **`uid` в appeal/cassation** — добавить извлечение `case_uid`, чинит детализацию в UI.
6. **Индекс `Map` для courts** — `findCourtBySubdomain`/`findCourtByCode` (O(n) → O(1)).
7. **Верификация `caseUrl` для appeal/cassation** — проверить на реальном суде (домен `kas.sudrf.ru` / `oblsud--`).
8. **Бейдж `35_passing`** — обновить или вернуть тесты в репо.
9. **`execSync` unused import** в `viewer/server.ts:8` — удалить.
10. **`magistrate.ts:16`** — `URLSearchParams` (UTF-8) вместо `encodeParam` (CP1251); учесть при реализации (msudrf может быть CP1251).
