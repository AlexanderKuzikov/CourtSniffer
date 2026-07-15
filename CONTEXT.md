# CourtSniffer — CONTEXT

> Актуальный статус, архитектура и журнал работ.

## Статус

✅ **v0.1.0** — базовый функционал работает.

| Компонент | Статус |
|-----------|--------|
| District поиск (номер дела) | ✅ Работает |
| District поиск (участники) | ✅ Работает |
| Appeal поиск | ✅ Реализован (не тестирован) |
| Cassation поиск | ✅ Реализован (не тестирован) |
| Magistrate: captcha (RuCaptcha) | ✅ Работает (~5-6 сек, 120s timeout) |
| Magistrate: парсинг по URL дела | ✅ Работает (через Puppeteer+RuCaptcha) |
| Magistrate: поиск по номеру/участникам | ✅ Работает (сессия: captcha → same-session goto) |
| CLI | ✅ Работает (code + subdomain fallback) |
| Web UI + API | ✅ Express 5, типизированный, code-based |
| Справочник судов | ✅ 10 225 записей, O(1)-lookup (Map по code + subdomain) |
| Расширенный поиск судов | ✅ AND по словам, регистронезависимо |
| Smoke test | ✅ Работает |
| Typecheck | ✅ `tsc --noEmit` чист |

## Архитектура

`packages/search/` — монопакет (не монорепа).

Адаптеры — по одному на тип суда, как в CourtFlow:
- `district`: `*.sudrf.ru`, `delo_id=1540005`, без капчи
- `appeal`: `*oblsud--*.sudrf.ru`, `delo_id=5`, без капчи
- `cassation`: `*.kas.sudrf.ru`, `delo_id=2800001`, без капчи
- `magistrate`: `*.msudrf.ru`, Puppeteer+RuCaptcha, поиск + парсинг URL

Все адаптеры реализуют `SearchAdapter`:
```typescript
interface SearchAdapter {
  searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]>;
  searchByParty(req: SearchRequest): Promise<SearchResult[]>;
  buildSearchUrl(req: SearchRequest): string;
}
```

### Идентификация суда

**`code` — основной идентификатор** (59RS0007). Subdomain остаётся технической
деталью для построения URL. `courts.ts` предоставляет `findCourtByCodeOrSubdomain(id)`,
которая пробует code (O(1)), затем subdomain (O(1)) — оба Map.

### Ключевые модули

- **`captcha/session.ts`** — открывает страницу msudrf через Puppeteer, определяет капчу
  (маркер `kcaptchaForm`), читает изображение через browser-context `fetch` с
  `credentials:'include'` (сохраняя сессионные куки), отправляет в RuCaptcha API v2,
  заполняет ответ и отправляет форму. После капчи — `waitForNetworkIdle` (а не
  `waitForNavigation`), т.к. msudrf обновляет контент через AJAX.
- **`captcha/rucaptcha.ts`** — клиент RuCaptcha API v2 (createTask/getTaskResult),
  типизированные ответы, polling с таймаутом 2 мин.
- **`encoding.ts`** — ручной percent-encoder для CP1251 (URLSearchParams кодирует UTF-8,
  а PHP-формы ГАС «Правосудие» ожидают CP1251 в query-string).

## Решения

| Дата | Решение |
|------|---------|
| 2026-07-15 | Создан отдельный репозиторий (не пакет в CourtFlow) |
| 2026-07-15 | Адаптеры — каждый тип суда свой файл (как CourtFlow) |
| 2026-07-15 | Справочник судов скопирован из CourtHarvest2 (10225 записей) |
| 2026-07-15 | Captcha-модуль скопирован из CourtFlow (puppeteer + RuCaptcha) |
| 2026-07-15 | CLI как точка входа для ручного поиска |
| 2026-07-15 | Web UI как Express-сервер + single-file HTML (event delegation, XSS-safe) |
| 2026-07-15 | `courts.ts`: Map-индексы для `findCourtBySubdomain`/`findCourtByCode` (O(1) вместо O(n) regex-перебора) |
| 2026-07-15 | `config.ts`: `.env` опционален — `loadEnvFile` в try/catch, запуск без `cp .env.example` не падает |
| 2026-07-15 | UI: `esc()` экранирует `&<>"'`, `safeUrl()` пропускает только `http(s)://` — защита от XSS и `javascript:` URL |
| 2026-07-15 | `server.ts`: полная типизация (`@types/express`), валидация `courtType`, server-side лог ошибок |
| 2026-07-15 | `core/errors.ts`: `isCaptchaPage` сужен до маркера `kcaptchaForm` (было широкое `'captcha'`) |
| 2026-07-15 | **`code` — основной идентификатор суда** — CLI, API, UI, адаптеры используют code (59RS0007). Subdomain — fallback. |
| 2026-07-15 | **`findCourtsByName` — AND по словам** — поиск разделяет запрос на слова ≥2 символов. |
| 2026-07-15 | **Magistrate: captcha + поиск через session-based goto** — после капчи на `op=hl`, поиск через `page.goto` с CP1251. |
| 2026-07-15 | **`session.ts`: `waitForNetworkIdle` вместо `waitForNavigation`** — msudrf не перезагружает страницу после капчи. |
| 2026-07-15 | **Timeout 120s для sudrf.ru** — сервер стал очень медленным (30+с). 15с→120с во всех адаптерах, HTTP 403/4xx явная ошибка. |

## Что дальше

1. Протестировать appeal/cassation адаптеры на реальных судах
2. Fuzzy match участников (поиск по фамилии с неточным совпадением)
3. Пагинация party-search (сейчас до 24 результатов без прокрутки)
4. Интеграция с CourtFlow (добавление найденных дел в watch/)
5. Unit-тесты (vitest)

## Журнал работ

| Дата | Коммит | Изменение |
|------|--------|-----------|
| 2026-07-15 | `72d5fc3` | init: project skeleton |
| 2026-07-15 | `fb971e9` | feat: court directory (10225 courts) |
| 2026-07-15 | `b155c24` | feat: search system with adapters, captcha, CLI |
| 2026-07-15 | `3582cb5` | refactor: adapters structure (like CourtFlow), remove prefixes |
| 2026-07-15 | `38e474a` | fix: CP1251 encoding, uid extraction, robust table parsing |
| 2026-07-15 | `0816d7b` | docs: Russian description, Apache-2.0 license, Node 24+ |
| 2026-07-15 | `d62795a` | feat(ui): Web UI for CourtSniffer |
| 2026-07-15 | `c8873ea..c782341` | CODE_REVIEW.md (пятиосевое ревью, 3 ревизии) |
| 2026-07-15 | (pending) | security/robustness — XSS, loadEnvFile, CLI, Map-index, types |
| **2026-07-15** | `dc008a1` | **feat: code как ID; AND-поиск; magistrate captcha+session; session.ts fix** |
| **2026-07-15** | **(pending)** | **fix: timeout 120s для sudrf.ru; HTTP 403/4xx обработка** |

## Недостатки

1. Appeal/cassation: не тестированы на реальных судах
2. Party search: до 24 результатов без прокрутки (pagination)
3. Нет fuzzy match для ФИО участников
4. Нет интеграции с CourtFlow
5. `rejectUnauthorized: false` без опции-переключателя
6. Нет unit-тестов
