/** Primary font family for map export / report text by i18n language code. */
export function getExportFontFamily(language: string): string {
  switch (language) {
    case 'kh':
      return 'Khmer';
    case 'عربى':
      return 'Noto Sans Arabic';
    default:
      return 'Roboto';
  }
}

/** CSS font stack for web export (Playwright) and MUI typography. */
export function getExportFontStack(language: string): string {
  const primary = getExportFontFamily(language);
  return `${primary}, Roboto, sans-serif`;
}

export function getExportTextDirection(language: string): 'rtl' | 'ltr' {
  return language === 'عربى' ? 'rtl' : 'ltr';
}

/** Wait for export @font-face / web fonts before Playwright captures the page. */
export async function waitForExportFonts(language: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) {
    return;
  }

  const primary = getExportFontFamily(language);
  if (primary !== 'Roboto') {
    try {
      await document.fonts.load(`16px ${primary}`);
      await document.fonts.load(`600 16px ${primary}`);
    } catch {
      // Non-fatal: PRISM_READY safety timeout still applies.
    }
  }

  await document.fonts.ready;
}
