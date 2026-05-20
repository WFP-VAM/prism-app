import {
  getExportFontFamily,
  getExportFontStack,
  getExportTextDirection,
} from './exportFontFamily';

describe('exportFontFamily', () => {
  it('returns Khmer for kh', () => {
    expect(getExportFontFamily('kh')).toBe('Khmer');
    expect(getExportFontStack('kh')).toContain('Khmer');
  });

  it('returns Noto Sans Arabic for Arabic locale', () => {
    expect(getExportFontFamily('عربى')).toBe('Noto Sans Arabic');
    expect(getExportFontStack('عربى')).toContain('Noto Sans Arabic');
  });

  it('defaults to Roboto', () => {
    expect(getExportFontFamily('en')).toBe('Roboto');
  });

  it('uses rtl for Arabic', () => {
    expect(getExportTextDirection('عربى')).toBe('rtl');
    expect(getExportTextDirection('kh')).toBe('ltr');
  });
});
