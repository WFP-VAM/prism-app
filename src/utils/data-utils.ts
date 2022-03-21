import { isNumber } from 'lodash';
import { i18nTranslator, safeTranslate } from '../i18n';

export function getRoundedData(
  data: number,
  t?: i18nTranslator,
  decimals: number = 3,
): string {
  if (isNumber(data)) {
    return parseFloat(data.toFixed(decimals)).toLocaleString();
  }
  const dataString = data || 'No Data';
  return t ? safeTranslate(t, dataString) : dataString;
}
