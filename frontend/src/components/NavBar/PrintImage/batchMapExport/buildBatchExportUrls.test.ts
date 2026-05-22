import { EXPORT_LANGUAGE_PARAM } from 'utils/exportLanguage';

import { buildBatchExportUrls } from './buildBatchExportUrls';
import type { BuildBatchExportUrlsInput } from './types';

const baseInput: BuildBatchExportUrlsInput = {
  formattedDates: ['2024-05-15'],
  origin: 'http://localhost:3000',
  exportPath: '/export',
  baseSearchParams: new URLSearchParams('country=mozambique'),
  printSelectedLayer: {
    id: 'precip_blended_dekad',
    title: 'Test layer',
  } as any,
  mapBounds: null,
  mapZoom: 5,
  mapDimensions: { aspectRatio: '4:3' },
  titleText: 'Title',
  footerText: '',
  footerTextSize: 12,
  logoPosition: 0,
  logoScale: 1,
  legendPosition: 0,
  legendScale: 1,
  bottomLogoScale: 1,
  toggles: {
    fullLayerDescription: true,
    countryMask: false,
    mapLabelsVisibility: true,
    logoVisibility: true,
    legendVisibility: true,
    footerVisibility: true,
    bottomLogoVisibility: true,
  },
  selectedBoundaries: [],
  language: 'pt',
};

describe('buildBatchExportUrls', () => {
  it('includes language query param on each export URL', () => {
    const urls = buildBatchExportUrls(baseInput);
    expect(urls).toHaveLength(1);
    const url = new URL(urls[0]);
    expect(url.searchParams.get(EXPORT_LANGUAGE_PARAM)).toBe('pt');
    expect(url.searchParams.get('hazardLayerIds')).toBe('precip_blended_dekad');
    expect(url.searchParams.get('date')).toBe('2024-05-15');
  });

  it('uses 2-letter language param for Arabic i18n key', () => {
    const urls = buildBatchExportUrls({ ...baseInput, language: 'ar' });
    const url = new URL(urls[0]);
    expect(url.searchParams.get(EXPORT_LANGUAGE_PARAM)).toBe('ar');
  });
});
