// Minimal compatibility layer for CourtFlow's captcha modules
export class CourtFlowError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CourtFlowError';
  }
}

// Маркер капчи в HTML msudrf.ru — форма kcaptchaForm.
// Сужено с общего 'captcha' (давало false positive на любое упоминание слова в тексте дела).
export function isCaptchaPage(html: string): boolean {
  return html.includes('kcaptchaForm');
}
