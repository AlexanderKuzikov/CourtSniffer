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
| Справочник судов | ✅ 10 225 записей |
| Smoke test | ✅ Работает |

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

## Что дальше

1. Протестировать appeal/cassation адаптеры
2. Реализовать magistrate через Puppeteer+RuCaptcha
3. Fuzzy match участников (поиск по фамилии с неточным совпадением)
4. Интеграция с CourtFlow (добавление найденных дел в watch/)
5. Web UI или API endpoint

## Журнал работ

| Дата | Коммит | Изменение |
|------|--------|-----------|
| 2026-07-15 | `72d5fc3` | init: project skeleton |
| 2026-07-15 | `fb971e9` | feat: court directory (10225 courts) |
| 2026-07-15 | `b155c24` | feat: search system with adapters, captcha, CLI |
| 2026-07-15 | `(current)` | fix: CP1251 encoding for party search, uid extraction, table selection |

## Недостатки / TODO

1. Appeal/cassation: не тестированы (нет подходящих номеров дел под рукой)
2. Magistrate: требует Puppeteer+RuCaptcha (WIP)
3. Party search: возвращает до 24 результатов без прокрутки (pagination)
4. Нет fuzzy match для ФИО участников
5. Нет интеграции с CourtFlow (авто-добавление дел в watch/)