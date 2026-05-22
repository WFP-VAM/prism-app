import khmerFontUrl from 'fonts/Khmer-Regular.ttf';

const EXPORT_FONT_SAMPLE_TEXT: Partial<Record<string, string>> = {
  km: 'កខគ',
  ar: 'العربية',
};

/** Primary font family for /export text by i18n language code. */
export function getExportFontFamily(language: string): string {
  switch (language) {
    case 'km':
      return 'Khmer';
    case 'ar':
      return 'Noto Sans Arabic';
    default:
      return 'Roboto';
  }
}

/** CSS font stack for /export (Playwright batch maps). */
export function getExportFontStack(language: string): string {
  const primary = getExportFontFamily(language);
  return `${primary}, Roboto, sans-serif`;
}

function cssFontFamily(family: string): string {
  return family.includes(' ') ? `"${family}"` : family;
}

let khmerFontFaceInjected = false;

function injectKhmerFontFace(): void {
  if (khmerFontFaceInjected || typeof document === 'undefined') {
    return;
  }
  khmerFontFaceInjected = true;
  const style = document.createElement('style');
  style.id = 'prism-export-font-khmer';
  style.textContent = `@font-face {
  font-family: Khmer;
  src: url(${khmerFontUrl}) format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}`;
  document.head.appendChild(style);
}

let arabicFontCssLoaded = false;

async function loadArabicFontCss(): Promise<void> {
  if (arabicFontCssLoaded) {
    return;
  }
  arabicFontCssLoaded = true;
  await import('@fontsource/noto-sans-arabic/400.css');
  await import('@fontsource/noto-sans-arabic/600.css');
}

/** Load bundled faces before /export renders (Playwright has no OS fonts). */
export async function loadExportFonts(language: string): Promise<void> {
  const sampleText = EXPORT_FONT_SAMPLE_TEXT[language];
  if (!sampleText) {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
    return;
  }

  if (language === 'km') {
    injectKhmerFontFace();
  } else if (language === 'ar') {
    await loadArabicFontCss();
  }

  if (typeof document === 'undefined' || !document.fonts?.load) {
    return;
  }

  const family = cssFontFamily(getExportFontFamily(language));

  try {
    await document.fonts.load(`400 16px ${family}`, sampleText);
    await document.fonts.load(`600 16px ${family}`, sampleText);
  } catch {
    // Non-fatal: PRISM_READY safety timeout still applies.
  }

  await document.fonts.ready;
}
