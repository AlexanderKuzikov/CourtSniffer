// Конфигурация CourtSniffer — загрузка секретов из .env
import { resolve } from 'path';

process.loadEnvFile(resolve(process.cwd(), '.env'));

export function getRuCaptchaKey(): string {
  return process.env.RUCAPTCHA_API_KEY || process.env.TWOCAPTCHA_API_KEY || '';
}

export function hasCaptchaKeys(): boolean {
  return Boolean(process.env.RUCAPTCHA_API_KEY || process.env.TWOCAPTCHA_API_KEY);
}
