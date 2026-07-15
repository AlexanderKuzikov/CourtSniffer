# CourtSniffer 🕵️

**Поиск судебных дел на сайтах судов РФ через ГАС «Правосудие».**

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-24+-339933?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?logo=github)](https://github.com/AlexanderKuzikov/CourtSniffer)

> **CourtSniffer** ищет дела по номеру, истцу или ответчику на порталах судов РФ
> (`*.sudrf.ru`, `*.msudrf.ru`). Поддерживает районные суды, апелляцию, кассацию и
> мировых судей. Извлекает дату вступления решения в законную силу — критично для
> контроля сроков обжалования и исполнительного производства.
>
> Интегрируется с [**CourtFlow**](https://github.com/AlexanderKuzikov/CourtFlow) —
> найденные дела можно отправлять в мониторинг.

## Возможности

| Режим | Что делает | district | appeal | cassation | magistrate |
|-------|------------|:--------:|:------:|:---------:|:----------:|
| По номеру дела | `op=sf → op=r` с `case_number` | ✅ | ✅ | ✅ | 🔧 |
| По участникам | ФИО ответчика / наименование истца + дата | ✅ | ✅ | ✅ | 🔧 |
| Дата вступления в силу | Парсинг колонки таблицы результатов | ✅ | ✅ | ✅ | 🔧 |
| Справочник судов | 10 225 судов РФ: адреса, сайты, коды | ✅ | | | |
| Web UI | Поиск + таблица + детализация | ✅ | | | |

`✅` работает и протестировано · `✅` реализовано, не тестировано на реальных судах · `🔧` в разработке (требует капчу)

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/CourtSniffer.git
cd CourtSniffer
npm install
cp .env.example .env   # опционально — ключи RuCaptcha нужны только для мировых судов
```

### CLI

```bash
# Поиск по номеру дела (районный суд)
npm run search:case -- --court sverdlov--perm --number 2-1234/2024

# Поиск по ответчику за период
npm run search:party -- --court sverdlov--perm --defendant Кислицин --from 01.10.2023

# Поиск суда по названию (для подбора --court)
npm run search -- --list свердловский
```

Пример вывода (`search:case`):

```json
{
  "found": true,
  "count": 1,
  "results": [{
    "caseNumber": "2-1234/2024",
    "judge": "Чуракова Ольга Александровна",
    "result": "Иск (заявление, жалоба) УДОВЛЕТВОРЕН",
    "legalForceDate": "03.05.2024",
    "filingDate": "..." ,
    "courtId": "sverdlov--perm",
    "courtType": "district"
  }],
  "courtInfo": { "name": "Свердловский районный суд г. Перми", "code": "59RS0007", "region": "59" }
}
```

### Web UI

```bash
npm run ui
# → [viewer] CourtSniffer UI: http://127.0.0.1:8765
```

Тёмная тема, боковая панель поиска (подбор суда по названию, номер дела / участник),
таблица результатов с фильтрами по типу суда, панель деталей с датой вступления в силу.
Порт подбирается автоматически, если 8765 занят.

## CLI-референс

| Параметр | Описание | Пример |
|----------|----------|--------|
| `--court` | ID суда (subdomain) | `sverdlov--perm`, `6.perm` (magistrate) |
| `--type` | Тип суда: `district` (по умолч.) / `appeal` / `cassation` / `magistrate` | `--type appeal` |
| `--number` | Номер дела | `2-1234/2024` |
| `--defendant` | ФИО ответчика | `Кислицин` |
| `--plaintiff` | Наименование истца | `ООО УК Тихий Компрос` |
| `--from` | Дата поступления с (`ДД.ММ.ГГГГ`) | `01.10.2023` |
| `--to` | Дата поступления по (`ДД.ММ.ГГГГ`) | `31.12.2024` |
| `--list` | Поиск судов по названию | `--list миров` |

## API (Web UI)

| Метод | Путь | Тело / Query | Описание |
|-------|------|--------------|----------|
| `POST` | `/api/search/case-number` | `{ courtId, courtType?, caseNumber }` | Поиск по номеру |
| `POST` | `/api/search/party` | `{ courtId, courtType?, defendant?, plaintiff?, from?, to? }` | Поиск по участникам |
| `GET` | `/api/courts` | `?q=<название>` | Поиск судов по названию (до 30) |
| `GET` | `/api/courts` | — | `{ total, captcha }` — статус справочника |
| `GET` | `/api/courts/:subdomain` | — | Информация о суде |

`courtType` опционален, по умолчанию `district`. Сервер слушает `127.0.0.1` только.

## Архитектура

```
packages/
├── search/                    # Ядро поиска
│   ├── adapters/              # Strategy: один адаптер на тип суда
│   │   ├── types.ts           #   SearchAdapter interface
│   │   ├── registry.ts        #   Factory: getSearchAdapter(courtType)
│   │   ├── district.ts        #   *.sudrf.ru      delo_id=1540005
│   │   ├── appeal.ts          #   oblsud--*.sudrf  delo_id=5
│   │   ├── cassation.ts       #   *.kas.sudrf.ru   delo_id=2800001
│   │   └── magistrate.ts      #   *.msudrf.ru      капча (WIP)
│   ├── captcha/               # Puppeteer + RuCaptcha API v2
│   ├── core/errors.ts         # Совместимый слой для CourtFlow-модулей
│   ├── data/courts.json       # 10 225 судов РФ (из CourtHarvest2)
│   ├── config.ts              # .env → ключи (опционален)
│   ├── courts.ts              # O(1)-lookup через Map-индексы
│   ├── encoding.ts            # CP1251 percent-encoder для legacy PHP-форм
│   ├── types.ts               # SearchRequest, SearchResult
│   ├── cli.ts                 # CLI-точка входа
│   ├── smoke.ts               # E2E smoke-тест
│   └── index.ts               # Barrel публичного API
└── viewer/
    ├── server.ts              # Express 5, типизированный API
    └── public/index.html      # Single-file UI (event delegation, XSS-safe)
```

### Почему так

- **Адаптеры разделены, не объединены в базовый класс** — каждый тип суда развивается
  независимо. `delo_id`, `case_type`, структура таблиц и домены отличаются; связывание
  через базовый класс создало бы риск регрессии соседних адаптеров при правке одного.
- **CP1251 в URL** — PHP-формы ГАС «Правосудие» ожидают windows-1251 в query-string,
  а `URLSearchParams` всегда кодирует в UTF-8. `encoding.ts` делает ручной
  percent-encoding по CP1251-байтам — без этого поиск по русским ФИО возвращает пусто.
- **Справочник через `Map`** — 10 225 записей, lookup по subdomain/code за O(1),
  строится один раз при загрузке модуля.
- **Капча через browser-context `fetch`** — `captcha/session.ts` читает изображение
  капчи через `page.evaluate(fetch)` с `credentials:'include'`, а не `goto(imgUrl) +
  goBack()`. Последний инвалидирует captcha-токен в истории msudrf.ru.

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Язык | TypeScript 7.0, ESNext, `strict` |
| Парсинг HTML | cheerio 1.x |
| Кодировки | iconv-lite (win1251 ↔ UTF-8) |
| Капча (magistrate) | Puppeteer 25 + RuCaptcha API v2 |
| Web UI | Express 5 (типизированный, `127.0.0.1` only) |
| Запуск | tsx (TypeScript Execute) |
| HTTP | built-in `https` + `fetch` (Node 24+) |
| Проверка типов | `tsc --noEmit` |

## Разработка

```bash
npm run tsc       # typecheck (tsc --noEmit)
npm run smoke     # E2E: реальный запрос к sudrf.ru + справочник + конфиг
npm test          # vitest run
```

Smoke-тест делает живой запрос к `sverdlov--perm.sudrf.ru` — нужен интернет.
`.env` опционален: без него запуск не падает, просто magistrate-поиск недоступен.

## Статус и roadmap

**v0.1.0** — базовый функционал работает.

- [x] District поиск (номер + участники) — протестировано
- [x] Appeal / Cassation — реализованы, требуют проверки на реальных судах
- [x] Справочник 10 225 судов, CLI, Web UI
- [ ] Magistrate через Puppeteer + RuCaptcha
- [ ] Fuzzy match ФИО участников
- [ ] Пагинация party-search (сейчас до 24 результатов)
- [ ] Интеграция с CourtFlow (авто-добавление дел в `watch/`)

Подробности — в [`CONTEXT.md`](CONTEXT.md) и [`DECISIONS.md`](DECISIONS.md).

## Связанные проекты

- [**CourtFlow**](https://github.com/AlexanderKuzikov/CourtFlow) — мониторинг судебных дел (core + viewer + scheduler)
- [**CourtHarvest2**](https://github.com/AlexanderKuzikov/CourtHarvest2) — сбор справочника судов РФ

## License

[Apache-2.0](LICENSE) © Alexander Kuzikov
