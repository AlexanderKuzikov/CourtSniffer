# CourtSniffer 🕵️‍♂️

**Поиск судебных дел на сайтах судов РФ.**

CourtSniffer ищет дела по номеру, истцу или ответчику на порталах ГАС «Правосудие» (`*.sudrf.ru`, `*.msudrf.ru`).

## Возможности

- 🔍 **Поиск по номеру дела** — получить карточку дела + дату вступления в законную силу
- 👥 **Поиск по истцу/ответчику** — обнаружить новые дела по участникам
- 🏛️ **Все инстанции**: районные суды, апелляция, кассация, мировые судьи
- ⚡ **Без капчи** для district/appeal/cassation; с Puppeteer+RuCaptcha для magistrate
- 📋 **CLI** для ручного поиска и интеграции

## Быстрый старт

```bash
npm install

# Поиск по номеру дела
npm run search:case -- --court sverdlov--perm --number 2-1234/2024

# Поиск по участникам
npm run search:party -- --court sverdlov--perm --defendant Кислицин
```

## Архитектура

```
packages/search/
├── types.ts       # типы запросов и результатов
├── district.ts    # поиск по *.sudrf.ru
├── magistrate.ts  # поиск по *.msudrf.ru (с капчой)
├── matcher.ts     # эвристики совпадения
├── cli.ts         # CLI-интерфейс
└── index.ts       # экспорт
```

## Связанные проекты

- [CourtFlow](https://github.com/AlexanderKuzikov/CourtFlow) — мониторинг судебных дел
