# CourtSniffer 🕵️‍♂️

**Поиск судебных дел на сайтах судов РФ.**

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-24+-339933?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-35_passing-brightgreen)]()
[![GitHub](https://img.shields.io/badge/GitHub-repo-181717?logo=github)](https://github.com/AlexanderKuzikov/CourtSniffer)
[![Статус](https://img.shields.io/badge/Статус-Active-success)]()

**CourtSniffer** — поиск судебных дел на сайтах судов РФ через ГАС «Правосудие» (`*.sudrf.ru`, `*.msudrf.ru`).

> 🕵️ **CourtSniffer** ищет дела по номеру, истцу или ответчику на порталах судов. Поддерживает районные суды, апелляцию, кассацию и мировых судей. Автоматически извлекает дату вступления решения в законную силу.
>
> 🔗 **Интегрируется с [CourtFlow](https://github.com/AlexanderKuzikov/CourtFlow)** — найденные дела можно сразу отправлять в мониторинг.

## Возможности

| Режим | Описание | Статус |
|-------|----------|--------|
| 🔍 По номеру дела | `op=sf → op=r` с номером дела | ✅ district, ⏳ appeal, ⏳ cassation, ⏳ magistrate |
| 👥 По участникам | Поиск по ФИО ответчика / истца + дате | ✅ district, ⏳ appeal, ⏳ cassation, ⏳ magistrate |
| 📋 Дата вступления в силу | Извлекается из таблицы результатов | ✅ district |
| 🏛️ Справочник судов | 10 225 судов РФ с адресами и сайтами | ✅ |
| 🧪 Smoke test | Быстрая проверка работы | ✅ |

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/CourtSniffer.git
cd CourtSniffer
npm install
cp .env.example .env   # заполнить ключи RuCaptcha для мировых судов

# Поиск по номеру дела (районный суд)
npm run search:case -- --court sverdlov--perm --number 2-1234/2024

# Поиск по ответчику
npm run search:party -- --court sverdlov--perm --defendant Кислицин --from 01.10.2023

# Поиск суда по названию
npm run search -- --list свердловский
```

## Архитектура

```
packages/search/
├── adapters/           # Адаптеры по типу суда
│   ├── types.ts        # SearchAdapter interface
│   ├── registry.ts     # Диспетчеризация по courtType
│   ├── district.ts     # *.sudrf.ru (без капчи)
│   ├── appeal.ts       # oblsud--*.sudrf.ru (без капчи)
│   ├── cassation.ts    # *.kas.sudrf.ru (без капчи)
│   └── magistrate.ts   # *.msudrf.ru (с капчей, WIP)
├── captcha/            # Puppeteer+RuCaptcha (из CourtFlow)
├── data/               # Статические данные
│   └── courts.json     # 10 225 судов РФ
├── config.ts           # .env → API ключи
├── courts.ts           # Lookup-функции справочника
├── types.ts            # SearchRequest, SearchResult
├── cli.ts              # CLI-интерфейс
└── smoke.ts            # Smoke-тест
```

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Язык | TypeScript 7.0, ESNext |
| Парсинг HTML | cheerio 1.x |
| Кодировки | iconv-lite (win1251 → UTF-8) |
| Капча (magistrate) | Puppeteer + RuCaptcha |
| Тесты | vitest |
| Запуск | tsx (TypeScript Execute) |
| HTTP | built-in fetch + https (Node 24+) |

## Связанные проекты

- [CourtFlow](https://github.com/AlexanderKuzikov/CourtFlow) — мониторинг судебных дел (core + viewer + scheduler)
- [CourtHarvest2](https://github.com/AlexanderKuzikov/CourtHarvest2) — сбор справочника судов РФ

## License

Apache-2.0