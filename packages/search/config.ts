// Конфигурация CourtSniffer — загрузка секретов из .env
import { resolve } from 'path';

// .env опционален: запуск без cp .env.example .env не должен падать
try {
  process.loadEnvFile(resolve(process.cwd(), '.env'));
} catch (e: unknown) {
  if (!(e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT')) throw e;
}

export function getRuCaptchaKey(): string {
  return process.env.RUCAPTCHA_API_KEY || process.env.TWOCAPTCHA_API_KEY || '';
}

export function hasCaptchaKeys(): boolean {
  return Boolean(process.env.RUCAPTCHA_API_KEY || process.env.TWOCAPTCHA_API_KEY);
}
