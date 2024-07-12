import timezoneMock from 'timezone-mock';
import { createStaticRasterLayerUrl } from './utils';
import { timezones } from '../../../../../test/helpers';

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

  test.each(timezones)('Should work with %s', timezone => {
    timezoneMock.register(timezone);
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
