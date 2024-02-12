import timezoneMock from 'timezone-mock';
import { createStaticRasterLayerUrl } from '.';

const f = () => {
  const result = createStaticRasterLayerUrl(
    createUrlTestData.baseUrl,
    createUrlTestData.dates,
    createUrlTestData.selectedDate,
  );

  expect(result).toBe(createUrlTestData.result);
};

describe('createStaticRasterLayerUrl', () => {
  afterAll(() => {
    timezoneMock.unregister();
  });

  test('Should work with UTC', () => {
    timezoneMock.register('UTC');
    f();
  });

  test('Should work with US/Pacific', () => {
    timezoneMock.register('US/Pacific');
    f();
  });

  test('Should work with Etc/GMT-1', () => {
    timezoneMock.register('Etc/GMT-1');
    f();
  });
});

const createUrlTestData = {
  baseUrl:
    'https://prism-raster-tiles.s3.amazonaws.com/ssd-flood-events/test/{YYYY_MM_DD}/{z}/{x}/{y}.png',
  dates: ['2022-12-01', '2022-12-11'],
  selectedDate: 1670752800000,
  result:
    'https://prism-raster-tiles.s3.amazonaws.com/ssd-flood-events/test/2022_12_11/{z}/{x}/{y}.png',
};
