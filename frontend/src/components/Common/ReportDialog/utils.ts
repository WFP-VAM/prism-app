import { getExportFontFamily } from 'utils/exportFontFamily';

export const getReportFontFamily = (selectedLanguage: string): string =>
  getExportFontFamily(selectedLanguage);
