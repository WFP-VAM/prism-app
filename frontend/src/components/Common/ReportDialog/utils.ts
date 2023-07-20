export const getReportFontFamily = (selectedLanguage: string): string => {
  switch (selectedLanguage) {
    case 'kh':
      return 'Khmer';
    default:
      return 'Roboto';
  }
};
