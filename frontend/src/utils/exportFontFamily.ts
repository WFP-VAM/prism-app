import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/600.css';

import khmerFontUrl from 'fonts/Khmer-Regular.ttf';

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

/** Inject bundled faces and wait until they are usable (Playwright batch export). */
export async function loadExportFonts(language: string): Promise<void> {
  injectKhmerFontFace();
  await waitForExportFonts(language);
}

/** Wait for export fonts before Playwright captures the page. */
export async function waitForExportFonts(language: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) {
    return;
  }

  const primary = getExportFontFamily(language);
  if (primary === 'Roboto') {
    await document.fonts.ready;
    return;
  }

  const family = cssFontFamily(primary);
  const sampleText = language === 'kh' ? 'កខគ' : 'العربية';

  try {
    await document.fonts.load(`400 16px ${family}`, sampleText);
    await document.fonts.load(`600 16px ${family}`, sampleText);
  } catch {
    // Non-fatal: PRISM_READY safety timeout still applies.
  }

  await document.fonts.ready;
}
