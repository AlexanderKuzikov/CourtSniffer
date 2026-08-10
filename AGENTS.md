# CourtSniffer — Instructions for AI Agents

## Commands
- search: `npm run search`
- search:case: `npm run search:case`
- search:party: `npm run search:party`
- ui: `npm run ui`
- smoke: `npm run smoke`
- test: `npm test`
- typecheck: `npm run tsc`

## Conventions
- TypeScript 7, ESM, Node 24+, no build step (tsx)
- Один адаптер — один тип суда (district, appeal, cassation, magistrate)
- `code` (59RS0007) — основной идентификатор суда, subdomain — fallback
- CP1251 percent-encoding для URL (не UTF-8)
- RuCaptcha API v2 только
- `.env` опционален (try/catch loadEnvFile)

## Structure
- `packages/search/adapters/` — strategy: один адаптер на тип суда
- `packages/search/captcha/` — Puppeteer + RuCaptcha API v2
- `packages/search/data/courts.json` — 10 287 судов (из CourtOktmo)
- `packages/search/core/errors.ts` — совместимый слой для CourtFlow
- `packages/viewer/` — Express 5 + single-file HTML UI

## Do NOT touch
- `.env` — секреты
- `packages/search/data/courts.json` — генерируется из CourtOktmo
- `node_modules/`

## Documentation rules
- После работы — обнови docs/CONTEXT.md
- Если принял архитектурное решение — запиши в docs/DECISIONS.md
- НЕ создавай новых файлов документации без разрешения
- Переиспользуемые знания — в D:\GitHub\knowledge/README.md
