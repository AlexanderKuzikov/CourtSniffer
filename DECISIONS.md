# DECISIONS

## 2026-07-15

### Адаптеры как в CourtFlow
Каждый тип суда — отдельный класс с единым интерфейсом SearchAdapter.
Диспетчеризация через registry.getSearchAdapter(courtType).

### Поиск через op=sf → op=r
Страница поиска (search form) отправляет GET на search results.
Парсим таблицу — колонки: номер, дата, категория, судья, решение, **дата вступления в силу**.

### delo_id для разных типов судов:
| Тип | delo_id |
|-----|---------|
| Районный суд (гражданские) | 1540005 |
| Апелляция | 5 |
| Кассация | 2800001 |
| Мировые | — (своя структура) |

### RuCaptcha из CourtFlow
Модули rucaptcha.ts и session.ts скопированы как есть.
Ключи читаются из .env (RUCAPTCHA_API_KEY).

### Справочник судов
Скопирован из CourtHarvest2 (10 225 записей).
Поле `website` маппится в subdomain CourtFlow.

### .env опционален
`process.loadEnvFile` обёрнут в try/catch (ENOENT проглатывается).
Запуск без `cp .env.example .env` не падает — ключи нужны только для magistrate.

### O(1)-lookup справочника
`courts.ts` строит `Map<subdomain, CourtInfo>` и `Map<code, CourtInfo>` один раз
при загрузке модуля. `findCourtBySubdomain`/`findCourtByCode` — O(1) вместо
O(n) regex-перебора 10 225 записей. `findCourtsByName` остаётся линейным (текстовый поиск).

### UI: XSS-safe рендер
Single-file HTML, инлайн-`onclick` с внешними данными заменён на event delegation
(`data-*` + `addEventListener`). `esc()` экранирует `&<>"'`, `safeUrl()` пропускает
только `http(s)://` — защита от `javascript:` URL в `href`.

### Server: типизация и валидация
`server.ts` полностью типизирован (`@types/express`, `Request`/`Response`).
`courtType` из `req.body` валидируется через type guard `isCourtType()`.
Ошибки логируются server-side (`console.error`), клиенту отдаётся `errMsg()`.

### isCaptchaPage сужен
`core/errors.ts`: `isCaptchaPage(html: string)` проверяет маркер `kcaptchaForm`
вместо широкого `'captcha'` (давало false positive на упоминание слова в тексте дела).
