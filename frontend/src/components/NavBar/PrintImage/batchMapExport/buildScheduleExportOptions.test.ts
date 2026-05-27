import type { LngLatBounds } from 'maplibre-gl';

import { buildScheduleExportOptions } from './buildScheduleExportOptions';

const defaultToggles = {
  fullLayerDescription: true,
  countryMask: false,
  mapLabelsVisibility: true,
  logoVisibility: true,
  legendVisibility: true,
  footerVisibility: true,
  batchMapsVisibility: true,
  bottomLogoVisibility: true,
};

const mapBounds = {
  getWest: () => 30,
  getSouth: () => -26,
  getEast: () => 41,
  getNorth: () => -10,
} as LngLatBounds;

describe('buildScheduleExportOptions', () => {
  test('builds export_options aligned with batch export template', () => {
    const options = buildScheduleExportOptions({
      origin: 'https://prism.example.org',
      exportPath: '/mozambique/export',
      mapBounds,
      mapZoom: 5.5,
      mapDimensions: { aspectRatio: '4:3' },
      titleText: 'Mozambique: {date_coverage}',
      footerText: 'Footer text',
      footerTextSize: 12,
      logoPosition: 0,
      logoScale: 1,
      legendPosition: 1,
      legendScale: 0.8,
      bottomLogoScale: 1,
      toggles: defaultToggles,
      selectedBoundaries: ['MOZ01'],
      viewportWidth: 1200,
      viewportHeight: 900,
    });

    expect(options.origin).toBe('https://prism.example.org');
    expect(options.exportPath).toBe('/mozambique/export');
    expect(options.viewportWidth).toBe(1200);
    expect(options.viewportHeight).toBe(900);
    expect(options.queryParams.bounds).toBe('30,-26,41,-10');
    expect(options.queryParams.zoom).toBe('5.5');
    expect(options.queryParams.aspectRatio).toBe('4:3');
    expect(options.queryParams.title).toBe('Mozambique: {date_coverage}');
    expect(options.queryParams.selectedBoundaries).toEqual(['MOZ01']);
    expect(options.queryParams.toggles?.fullLayerDescription).toBe(true);
    expect(options.queryParams).not.toHaveProperty('date');
    expect(options.queryParams).not.toHaveProperty('hazardLayerIds');
  });
});
