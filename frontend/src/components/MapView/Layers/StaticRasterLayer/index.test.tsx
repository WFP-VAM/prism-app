import { createStaticRasterLayerUrl } from '.';

test('StaticRasterLayer utils', () => {
  const result = createStaticRasterLayerUrl(
    createUrlTestData.baseUrl,
    createUrlTestData.dates,
    createUrlTestData.selectedDate,
  );

  expect(result).toBe(createUrlTestData.result);
});

const createUrlTestData = {
  baseUrl:
    'https://prism-raster-tiles.s3.amazonaws.com/ssd-flood-events/test/{YYYY_MM_DD}/{z}/{x}/{y}.png',
  dates: ['2022-12-01', '2022-12-11'],
  selectedDate: 1670752800000,
  result:
    'https://prism-raster-tiles.s3.amazonaws.com/ssd-flood-events/test/2022_12_11/{z}/{x}/{y}.png',
};
