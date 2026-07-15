// Minimal compatibility layer for CourtFlow's captcha modules
export class CourtFlowError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CourtFlowError';
  }
}

// Check if page requires captcha
export function isCaptchaPage(page: any): boolean {
  return page.includes('kcaptchaForm') || page.includes('captcha');
}
