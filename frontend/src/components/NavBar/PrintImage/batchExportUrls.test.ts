import type { LngLatBounds } from 'maplibre-gl';

import {
  buildBatchExportUrls,
  formatExportUrlForClipboard,
} from './batchExportUrls';

const defaultToggles = {
  fullLayerDescription: true,
  countryMask: false,
  mapLabelsVisibility: true,
  logoVisibility: true,
  legendVisibility: true,
  footerVisibility: true,
  bottomLogoVisibility: true,
};

const baseParams = {
  pageUrl: 'http://localhost:3000/mozambique?baselineLayerId=old-layer',
  layerId: 'rainfall_blended_dekad',
  formattedDates: ['2024-05-01', '2024-05-11'],
  mapBounds: {
    getWest: () => 30,
    getSouth: () => -26,
    getEast: () => 41,
    getNorth: () => -10,
  } as LngLatBounds,
  mapZoom: 5.5,
  aspectRatio: '4:3' as const,
  titleText: 'Mozambique - {date_coverage}',
  footerText: 'Footer text',
  footerTextSize: 12,
  logoPosition: 0,
  logoScale: 1,
  legendPosition: 1,
  legendScale: 0.8,
  bottomLogoScale: 1,
  toggles: defaultToggles,
  selectedBoundaries: ['MOZ01', 'MOZ02'],
};

describe('buildBatchExportUrls', () => {
  test('builds one export URL per date', () => {
    const urls = buildBatchExportUrls(baseParams);

    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('/export?');
    expect(urls[1]).toContain('/export?');
  });

  test('sets layer, date, bounds, zoom, and print options', () => {
    const [firstUrl] = buildBatchExportUrls(baseParams);
    const params = new URL(firstUrl).searchParams;

    expect(params.get('date')).toBe('2024-05-01');
    expect(params.get('hazardLayerIds')).toBe('rainfall_blended_dekad');
    expect(params.get('baselineLayerId')).toBeNull();
    expect(params.get('bounds')).toBe('30,-26,41,-10');
    expect(params.get('zoom')).toBe('5.5');
    expect(params.get('aspectRatio')).toBe('4:3');
    expect(params.get('title')).toBe('Mozambique - {date_coverage}');
    expect(params.get('footer')).toBe('Footer text');
    expect(params.get('footerTextSize')).toBe('12');
    expect(params.get('selectedBoundaries')).toBe('MOZ01,MOZ02');
    expect(params.get('toggles')).toBeNull();
    expect(params.get('fullLayerDescription')).toBe('true');
    expect(params.get('countryMask')).toBe('false');
    expect(params.get('mapLabelsVisibility')).toBe('true');
    expect(params.get('logoVisibility')).toBe('true');
    expect(params.get('legendVisibility')).toBe('true');
    expect(params.get('footerVisibility')).toBe('true');
    expect(params.get('bottomLogoVisibility')).toBe('true');
  });

  test('formats clipboard URLs without percent-encoding', () => {
    const [url] = buildBatchExportUrls({
      ...baseParams,
      titleText: 'Mozambique: {date_coverage}',
    });

    expect(formatExportUrlForClipboard(url)).toContain('bounds=30,-26,41,-10');
    expect(formatExportUrlForClipboard(url)).toContain(
      'title=Mozambique: {date_coverage}',
    );
    expect(formatExportUrlForClipboard(url)).not.toContain('%2C');
    expect(formatExportUrlForClipboard(url)).not.toContain('%7B');
  });

  test('uses custom aspect ratio params when provided', () => {
    const [url] = buildBatchExportUrls({
      ...baseParams,
      aspectRatio: { w: 16, h: 9 },
    });
    const params = new URL(url).searchParams;

    expect(params.get('aspectRatio')).toBe('Custom');
    expect(params.get('customWidth')).toBe('16');
    expect(params.get('customHeight')).toBe('9');
  });

  test('omits bounds and zoom when they are not available', () => {
    const [url] = buildBatchExportUrls({
      ...baseParams,
      mapBounds: null,
      mapZoom: null,
    });
    const params = new URL(url).searchParams;

    expect(params.get('bounds')).toBeNull();
    expect(params.get('zoom')).toBeNull();
  });
});
