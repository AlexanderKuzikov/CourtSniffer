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
| Magistrate поиск | 🔧 Требует captcha |
| CLI | ✅ Работает |
| Web UI + API | ✅ Express 5, типизированный |
| Справочник судов | ✅ 10 225 записей, O(1)-lookup (Map) |
| Smoke test | ✅ Работает |
| Typecheck | ✅ `tsc --noEmit` чист |

## Архитектура

`packages/search/` — монопакет (не монорепа).

Адаптеры — по одному на тип суда, как в CourtFlow:
- `district`: `*.sudrf.ru`, `delo_id=1540005`, без капчи
- `appeal`: `*oblsud--*.sudrf.ru`, `delo_id=5`, без капчи
- `cassation`: `*.kas.sudrf.ru`, `delo_id=2800001`, без капчи
- `magistrate`: `*.msudrf.ru`, с Puppeteer+RuCaptcha

Все адаптеры реализуют `SearchAdapter`:
```typescript
interface SearchAdapter {
  searchByCaseNumber(req: SearchRequest): Promise<SearchResult[]>;
  searchByParty(req: SearchRequest): Promise<SearchResult[]>;
  buildSearchUrl(req: SearchRequest): string;
}
```

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

## Что дальше

1. Протестировать appeal/cassation адаптеры на реальных судах
2. Реализовать magistrate через Puppeteer+RuCaptcha
3. Fuzzy match участников (поиск по фамилии с неточным совпадением)
4. Пагинация party-search (сейчас до 24 результатов без прокрутки)
5. Интеграция с CourtFlow (добавление найденных дел в watch/)

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
| 2026-07-15 | `c8873ea`..`c782341` | docs: CODE_REVIEW.md (пятиосевое ревью, 3 ревизии) |
| 2026-07-15 | (pending) | fix: security/robustness — XSS в UI (esc+safeUrl+delegation), loadEnvFile try/catch, CLI exit, uid в appeal/cassation, Map-индекс courts, типизация server.ts, LICENSE Apache-2.0, README 10/10 |

## Недостатки / TODO

1. Appeal/cassation: не тестированы на реальных судах (нет подходящих номеров дел под рукой)
2. Magistrate: требует Puppeteer+RuCaptcha (WIP)
3. Party search: возвращает до 24 результатов без прокрутки (pagination)
4. Нет fuzzy match для ФИО участников
5. Нет интеграции с CourtFlow (авто-добавление дел в watch/)
6. `rejectUnauthorized: false` в fetchHtml — вынуждено для самоподписанных sudrf.ru, без опции-переключателя