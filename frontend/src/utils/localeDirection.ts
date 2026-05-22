/** i18n language codes that use right-to-left text. */
export const RTL_LANGUAGE_CODES = ['ar'] as const;

export function isRtlLanguage(language: string | null | undefined): boolean {
  return RTL_LANGUAGE_CODES.includes(
    language as (typeof RTL_LANGUAGE_CODES)[number],
  );
}
