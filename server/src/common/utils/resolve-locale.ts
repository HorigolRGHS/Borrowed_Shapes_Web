export type Locale = 'en' | 'vi';

// Pick locale from Accept-Language. Only en/vi are supported; default en.
export function resolveLocale(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return 'en';
  const first = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('vi') ? 'vi' : 'en';
}
