// URL-encoding для старых сайтов sudrf.ru (ожидают CP1251 в URL)
// Node.js URLSearchParams и encodeURIComponent используют UTF-8,
// а PHP-формы ГАС «Правосудие» работают только с CP1251.

import iconv from 'iconv-lite';

export function encodeParam(value: string): string {
  if (!value) return '';
  const buf = iconv.encode(value, 'win1251');
  let result = '';
  for (const byte of buf) {
    if (
      (byte >= 0x30 && byte <= 0x39) || // 0-9
      (byte >= 0x41 && byte <= 0x5A) || // A-Z
      (byte >= 0x61 && byte <= 0x7A) || // a-z
      byte === 0x2D || byte === 0x2E || byte === 0x5F || byte === 0x7E // - . _ ~
    ) {
      result += String.fromCharCode(byte);
    } else {
      result += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
    }
  }
  return result;
}
