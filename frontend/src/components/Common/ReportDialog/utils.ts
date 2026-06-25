export const getReportFontFamily = (selectedLanguage: string): string => {
  switch (selectedLanguage) {
    case 'km':
      return 'Khmer';
    default:
      return 'Roboto';
  }
};
