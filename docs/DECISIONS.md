# DECISIONS

Архитектурные решения CourtSniffer, зафиксированные с датой и обоснованием.

---

## 2026-07-15 (таймауты)

### timeout 120s для sudrf.ru
sudrf.ru работает крайне медленно (30+ секунд ответ). В пиковые нагрузки
сервер может не отвечать минуту и более. Увеличено с 15с → 120с во всех
трёх адаптерах (district, appeal, cassation). Также добавлена обработка
HTTP 403/4xx — явная ошибка вместо `socket hang up`.

**Итоговые таймауты:**
- district, appeal, cassation (simpleFetch): 120s
- magistrate captcha (RuCaptcha): 120s polling
- magistrate captcha (browser navigation): 60s

---

## 2026-07-15 (финал)

### session.ts: waitForNetworkIdle вместо waitForNavigation
Исходный код `fetchMagistrateHtml` использовал `Promise.all([waitForNavigation, click])`.
На msudrf после captcha submit контент обновляется **без полной перезагрузки** (AJAX).
`waitForNavigation` ждал 60 секунд, таймаутил, и `isCaptchaPage` на старом HTML
возвращал true → "Captcha loop".

**Решение:** `click()` → `waitForNetworkIdle()`. После отправки капчи ждём, пока
утихнет сетевая активность, и читаем `page.content()`. Проверено на `op=cs&case_id=…`
и `name_op=r` — капча решается с первого раза.

### Magistrate: session-based goto для поиска
После решения капчи на `op=hl` (список дел), браузерная сессия сохраняет куки.
Дальнейшие `page.goto(searchUrl)` в рамках той же сессии НЕ требуют повторной капчи
для `name_op=r` с CP1251-параметрами. Важно: переход через `page.goto`, а не через
JS-кнопку «Искать» на странице (которая использует `op=sf` и UTF-8 encoding и
заканчивается капчей).

### code — основной идентификатор суда
`code` (59RS0007) стал единственным идентификатором суда в UI, CLI и API.
Subdomain (sverdlov--perm) — техническая деталь для построения URL.
`findCourtByCodeOrSubdomain(id)` разрешает оба формата (сначала code O(1), 
затем subdomain O(1)). Причина: code — читаемый, человеко-понятный идентификатор
(регион + тип + номер), не зависящий от структуры URL.

### findCourtsByName — AND по словам
Поиск разбивает запрос на слова (>=2 символов), все должны присутствовать в названии.
Регистронезависимо. Пример: «индустриальный суд» → находит «Индустриальный районный
суд г. Перми» (содержит И «индустриальный» И «суд»). Прежний includes по полной
строке не находил многословные запросы.

### msudrf reverse-engineering findings
Структура вкладок (все формы загружены сразу, не через AJAX):
```html
<ul class="bookmarks">
  <li id="schedule">Расписание слушаний дел</li>
  <li id="type_0" data-delo-id="1540006">Уголовные дела</li>
  <li id="type_1" data-delo-id="1540005">Гражданские и административные дела</li>
  <li id="type_2" data-delo-id="1500001">Дела об АП</li>
</ul>
<div id="bookmark_type_1" class="bookmark-content">  <!-- содержит форму -->
  <input name="g1_case__CASE_NUMBERSS">
  <input name="G1_PARTS__NAMESS">
  ...
</div>
<div id="button_block">
  <input type="button" value="Искать" class="button-normal search">
</div>
<div id="search_results"></div>
```

Поля поиска НЕ внутри `<form>` — отправка через JavaScript.
JS-кнопка использует `op=sf` (show form) и UTF-8 encoding.
Адаптер использует прямой `name_op=r` с CP1251 — работает без капчи (после сессии).

**`delo_id` для magistrate:** совпадает с district — `1540005` (гражданские дела).
Подтверждено `data-delo-id="1540005"` на вкладке type_1.

---

## 2026-07-15 (первая половина)

### Адаптеры как в CourtFlow
Каждый тип суда — отдельный класс с единым интерфейсом SearchAdapter.
Диспетчеризация через registry.getSearchAdapter(courtType).

### Поиск через op=sf → op=r
Страница поиска (search form) отправляет GET на search results.
Парсим таблицу — колонки: номер, дата, категория, судья, решение, **дата вступления в силу**.

### delo_id для разных типов судов:
| Тип | delo_id | Примечание |
|-----|---------|------------|
| Районный суд (гражданские) | 1540005 | district, magistrate |
| Апелляция | 5 | appeal |
| Кассация | 2800001 | cassation |

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
