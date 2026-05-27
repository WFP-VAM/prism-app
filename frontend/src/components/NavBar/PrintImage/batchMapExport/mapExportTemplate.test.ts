import type { AspectRatio } from 'components/MapExport/types';
import type { LngLatBounds } from 'maplibre-gl';
import { EXPORT_LANGUAGE_PARAM } from 'utils/exportLanguage';
import type { DateCompatibleLayer } from 'utils/server-utils';

import {
  applyMapExportPrintTemplate,
  buildBatchExportUrls,
  buildScheduleExportOptions,
  formatExportUrlForClipboard,
  getExportPageLocation,
} from './mapExportTemplate';

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
  baseSearchParams: new URLSearchParams('baselineLayerId=old-layer'),
  printSelectedLayer,
  mapBounds,
  mapZoom: 5.5,
  mapDimensions: { aspectRatio: '4:3' as const },
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
  language: 'en',
};

describe('buildBatchExportUrls', () => {
  test('builds one export URL per date with JSON toggles', () => {
    const urls = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01', '2024-05-11'],
    });

    expect(urls).toHaveLength(2);
    const params = new URL(urls[0]).searchParams;
    expect(params.get('date')).toBe('2024-05-01');
    expect(params.get('hazardLayerIds')).toBe('rainfall_blended_dekad');
    expect(params.get('baselineLayerId')).toBeNull();
    expect(params.get('bounds')).toBe('30,-26,41,-10');
    expect(params.get('zoom')).toBe('5.5');
    expect(params.get('toggles')).toBe(
      JSON.stringify({
        fullLayerDescription: true,
        countryMask: false,
        mapLabelsVisibility: true,
        logoVisibility: true,
        legendVisibility: true,
        footerVisibility: true,
        bottomLogoVisibility: true,
      }),
    );
    expect(params.get('fullLayerDescription')).toBeNull();
  });

  test('includes language query param on each export URL', () => {
    const urls = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
      language: 'pt',
    });
    const params = new URL(urls[0]).searchParams;
    expect(params.get(EXPORT_LANGUAGE_PARAM)).toBe('pt');
  });

  test('uses 2-letter language param for Arabic i18n key', () => {
    const urls = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
      language: 'ar',
    });
    expect(new URL(urls[0]).searchParams.get(EXPORT_LANGUAGE_PARAM)).toBe('ar');
  });

  test('formats clipboard URLs without percent-encoding', () => {
    const [url] = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
      titleText: 'Mozambique: {date_coverage}',
    });

    expect(formatExportUrlForClipboard(url)).toContain('bounds=30,-26,41,-10');
    expect(formatExportUrlForClipboard(url)).toContain(
      'title=Mozambique: {date_coverage}',
    );
    expect(formatExportUrlForClipboard(url)).not.toContain('%2C');
  });

  test('uses custom aspect ratio params when provided', () => {
    const [url] = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
      mapDimensions: { aspectRatio: { w: 16, h: 9 } },
    });
    const params = new URL(url).searchParams;

    expect(params.get('aspectRatio')).toBe('Custom');
    expect(params.get('customWidth')).toBe('16');
    expect(params.get('customHeight')).toBe('9');
  });

  test('omits bounds and zoom when not available', () => {
    const [url] = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
      mapBounds: null,
      mapZoom: null,
    });
    const params = new URL(url).searchParams;

    expect(params.get('bounds')).toBeNull();
    expect(params.get('zoom')).toBeNull();
  });
});

describe('buildScheduleExportOptions', () => {
  test('builds export_options from the same template fields', () => {
    const options = buildScheduleExportOptions({
      ...sharedTemplate,
      selectedBoundaries: ['MOZ01'],
      viewportWidth: 1200,
      viewportHeight: 900,
    });

    expect(options.origin).toBe('https://prism.example.org');
    expect(options.queryParams.bounds).toBe('30,-26,41,-10');
    expect(options.queryParams.zoom).toBe('5.5');
    expect(options.queryParams.aspectRatio).toBe('4:3');
    expect(options.queryParams.toggles?.fullLayerDescription).toBe(true);
    expect(options.queryParams).not.toHaveProperty('date');
    expect(options.queryParams).not.toHaveProperty('hazardLayerIds');
  });
});

describe('schedule/batch template parity', () => {
  test('schedule queryParams match batch URL except date and layer', () => {
    const [batchUrl] = buildBatchExportUrls({
      ...sharedTemplate,
      formattedDates: ['2024-05-01'],
    });
    const batchParams = new URL(batchUrl).searchParams;

    const schedule = buildScheduleExportOptions({
      ...sharedTemplate,
      selectedBoundaries: ['MOZ01'],
      viewportWidth: 1200,
      viewportHeight: 900,
    });

    expect(schedule.queryParams.bounds).toBe(batchParams.get('bounds'));
    expect(schedule.queryParams.zoom).toBe(batchParams.get('zoom'));
    expect(schedule.queryParams.aspectRatio).toBe(
      batchParams.get('aspectRatio'),
    );
    expect(schedule.queryParams.title).toBe(batchParams.get('title'));
    expect(schedule.queryParams.toggles).toEqual(
      JSON.parse(batchParams.get('toggles') ?? '{}'),
    );
  });
});

describe('getExportPageLocation', () => {
  test('derives export path and inherits search params', () => {
    const location = getExportPageLocation(
      'https://prism.example.org/mozambique?baselineLayerId=old-layer',
    );
    expect(location.origin).toBe('https://prism.example.org');
    expect(location.exportPath).toBe('/mozambique/export');
    expect(location.baseSearchParams.get('baselineLayerId')).toBe('old-layer');
  });
});

describe('applyMapExportPrintTemplate', () => {
  test('can round-trip through URLSearchParams', () => {
    const params = new URLSearchParams();
    applyMapExportPrintTemplate(params, {
      mapBounds,
      mapZoom: 4,
      mapDimensions: { aspectRatio: 'A4-P' as AspectRatio },
      titleText: 'T',
      footerText: 'F',
      footerTextSize: 10,
      logoPosition: 0,
      logoScale: 1,
      legendPosition: 0,
      legendScale: 1,
      bottomLogoScale: 1,
      toggles: defaultToggles,
      selectedBoundaries: [],
    });
    expect(params.get('aspectRatio')).toBe('A4-P');
    expect(JSON.parse(params.get('toggles') ?? '{}')).toMatchObject({
      countryMask: false,
    });
  });
});
