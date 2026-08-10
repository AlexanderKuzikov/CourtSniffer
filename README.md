<p align="center">
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript 7" src="https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://nodejs.org/"><img alt="Node 24" src="https://img.shields.io/badge/Node-24+-339933?logo=node.js&logoColor=white"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-blue.svg"></a>
</p>

<h1 align="center">CourtSniffer</h1>
<p align="center">Поиск судебных дел на сайтах судов РФ через ГАС «Правосудие»</p>

---

Ищет дела по номеру, истцу или ответчику на порталах `*.sudrf.ru` и `*.msudrf.ru`. Поддерживает районные, апелляционные, кассационные суды и мировых судей. Извлекает дату вступления решения в законную силу — критично для контроля сроков обжалования.

- **4 типа судов** — district, appeal, cassation, magistrate
- **Справочник 10 287 судов** — O(1)-lookup по коду и subdomain
- **Magistrate captcha** — Puppeteer + RuCaptcha API v2, однократно на сессию
- **Web UI** — Express 5, тёмная тема, поиск + таблица + детализация
- **CLI** — поиск по номеру, участникам, названию суда (AND по словам)
- **CP1251 encoding** — ручной percent-encoder для legacy PHP-форм

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/CourtSniffer.git
cd CourtSniffer
npm install
cp .env.example .env   # опционально — ключи только для magistrate

npm run search:case -- --court 59RS0007 --number 2-1234/2024
npm run ui             # http://127.0.0.1:8765
```

## Документация

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — состояние проекта
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — архитектурные решения

## Статус

**v0.1.0** — базовый функционал работает. District/appeal/cassation/magistrate поиск, CLI, Web UI, справочник судов.

## Лицензия

[Apache-2.0](LICENSE) © Alexander Kuzikov
