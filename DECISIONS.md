# DECISIONS

## 2026-07-15: Создание проекта

- Отдельный репозиторий (не пакет в CourtFlow)
- Поиск через `op=sf` → `op=r`
- Формат ответа: `SearchResult { caseNumber, url, uid, judge, result, legalForceDate, parties[] }`
- Два режима CLI: `--case` (номер дела), `--party` (участники)
