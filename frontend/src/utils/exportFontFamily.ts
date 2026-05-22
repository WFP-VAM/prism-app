import '@fontsource/noto-sans-arabic/400.css';
import '@fontsource/noto-sans-arabic/600.css';

import khmerFontUrl from 'fonts/Khmer-Regular.ttf';

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

/** Load bundled faces before /export renders (Playwright has no OS fonts). */
export async function loadExportFonts(language: string): Promise<void> {
  if (language === 'km') {
    injectKhmerFontFace();
  }

  if (typeof document === 'undefined' || !document.fonts?.load) {
    return;
  }

  const primary = getExportFontFamily(language);
  if (primary === 'Roboto') {
    await document.fonts.ready;
    return;
  }

  const family = cssFontFamily(primary);
  const sampleText = language === 'km' ? 'កខគ' : 'العربية';

  try {
    await document.fonts.load(`400 16px ${family}`, sampleText);
    await document.fonts.load(`600 16px ${family}`, sampleText);
  } catch {
    // Non-fatal: PRISM_READY safety timeout still applies.
  }

  await document.fonts.ready;
}
