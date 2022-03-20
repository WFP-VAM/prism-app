import { i18nTranslator, safeTranslate } from '../i18n';

export function getRoundedData(
  data: number,
  t?: i18nTranslator,
  decimals: number = 3,
): string {
  if (data) {
    return parseFloat(data.toFixed(decimals)).toLocaleString();
  }
  if (t) {
    return safeTranslate(t, 'No Data');
  }
  return 'No Data';
}
