import type { LngLatBounds } from 'maplibre-gl';
import type { DateCompatibleLayer } from 'utils/server-utils';

import { buildBatchExportUrls } from './buildBatchExportUrls';
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

const printSelectedLayer = {
  id: 'rainfall_blended_dekad',
  title: 'Rainfall',
} as DateCompatibleLayer;

const sharedTemplate = {
  origin: 'https://prism.example.org',
  exportPath: '/mozambique/export',
  mapBounds,
  mapZoom: 5.5,
  mapDimensions: { aspectRatio: '4:3' as const },
  titleText: 'Mozambique: {date_coverage}',
  footerText: 'Footer',
  footerTextSize: 12,
  logoPosition: 0,
  logoScale: 1,
  legendPosition: 1,
  legendScale: 0.8,
  bottomLogoScale: 1,
  toggles: defaultToggles,
  selectedBoundaries: ['MOZ01'],
};

describe('schedule export template parity with batch URLs', () => {
  test('queryParams match batch export except date and layer placeholders', () => {
    const [batchUrl] = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
      baseSearchParams: new URLSearchParams('baselineLayerId=old'),
      printSelectedLayer,
    });
    const batchParams = new URL(batchUrl).searchParams;

    const schedule = buildScheduleExportOptions({
      ...sharedTemplate,
      viewportWidth: 1200,
      viewportHeight: 900,
    });

    expect(schedule.queryParams.bounds).toBe(batchParams.get('bounds'));
    expect(schedule.queryParams.zoom).toBe(batchParams.get('zoom'));
    expect(schedule.queryParams.aspectRatio).toBe(
      batchParams.get('aspectRatio'),
    );
    expect(schedule.queryParams.title).toBe(batchParams.get('title'));
    expect(schedule.queryParams.selectedBoundaries).toEqual(['MOZ01']);

    const batchToggles = JSON.parse(batchParams.get('toggles') ?? '{}');
    expect(schedule.queryParams.toggles).toEqual(batchToggles);

    expect(batchParams.get('date')).toBe('2024-05-01');
    expect(batchParams.get('hazardLayerIds')).toBe('rainfall_blended_dekad');
    expect(schedule.queryParams).not.toHaveProperty('date');
    expect(schedule.queryParams).not.toHaveProperty('hazardLayerIds');
  });
});
