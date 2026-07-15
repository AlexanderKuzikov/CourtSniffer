// packages/captcha/rucaptcha.ts
// RuCaptcha API v2 (api.rucaptcha.com) — createTask / getTaskResult
// Docs: https://rucaptcha.com/api-docs/normal-captcha
// НЕ использовать legacy /in.php + /res.php (API v1) — он может быть отключён без предупреждения.

const API_BASE = 'https://api.rucaptcha.com';

export interface RuCaptchaClientOptions {
  apiKey: string;
  softId?: string;
  pollingIntervalMs?: number;
  timeoutMs?: number;
}

export class RuCaptchaClient {
  private readonly apiKey: string;
  private readonly softId: string;
  private readonly pollingIntervalMs: number;
  private readonly timeoutMs: number;

  constructor(options: RuCaptchaClientOptions) {
    this.apiKey = options.apiKey;
    this.softId = options.softId ?? '';
    this.pollingIntervalMs = options.pollingIntervalMs ?? 5000;
    this.timeoutMs = options.timeoutMs ?? 120000;
  }

  async solveImage(imageBase64: string): Promise<string> {
    const taskId = await this.createTask(imageBase64);
    return this.pollResult(taskId);
  }

  private async createTask(imageBase64: string): Promise<number> {
    const res = await fetch(`${API_BASE}/createTask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientKey: this.apiKey,
        task: {
          type: 'ImageToTextTask',
          body: imageBase64,
          // msudrf captcha: буквы + цифры, регистронезависимая, ~4-6 символов
          numeric: 4,
          minLength: 4,
          maxLength: 6,
          case: false,
          languagePool: 'rn',
          ...(this.softId ? { softId: this.softId } : {}),
        },
      }),
    });

    const json = await res.json() as { errorId: number; errorCode?: string; taskId?: number };

    if (json.errorId !== 0) {
      throw new Error(`RuCaptcha createTask error: ${json.errorCode ?? json.errorId}`);
    }
    if (!json.taskId) {
      throw new Error('RuCaptcha createTask: нет taskId в ответе');
    }

    return json.taskId;
  }

  private async pollResult(taskId: number): Promise<string> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, this.pollingIntervalMs));

      const res = await fetch(`${API_BASE}/getTaskResult`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientKey: this.apiKey,
          taskId,
        }),
      });

      const json = await res.json() as {
        errorId: number;
        errorCode?: string;
        status: 'processing' | 'ready';
        solution?: { text: string };
      };

      if (json.errorId !== 0) {
        throw new Error(`RuCaptcha getTaskResult error: ${json.errorCode ?? json.errorId}`);
      }
      if (json.status === 'processing') continue;
      if (json.status === 'ready') {
        if (!json.solution?.text) {
          throw new Error('RuCaptcha: статус ready, но solution.text отсутствует');
        }
        return json.solution.text;
      }

      throw new Error(`RuCaptcha: неожиданный статус: ${json.status}`);
    }

    throw new Error('RuCaptcha timeout');
  }
}