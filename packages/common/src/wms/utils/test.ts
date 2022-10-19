import findAndRead from 'find-and-read';
import test from 'flug';

import {
  createGetMapUrl,
  findLayer,
  getLayerIds,
  getLayerNames,
  getLayerDates,
  parseLayer,
} from '.';

const xml = findAndRead('./data/geonode-wms-get-capabilities-1.3.0.xml', {
  encoding: 'utf-8',
});

const odcXml = findAndRead(
  './data/mongolia-sibelius-datacube-wms-get-capabilities-1.3.0.xml',
  {
    encoding: 'utf-8',
  },
);

test('get layer ids', async ({ eq }) => {
  const layerIds = getLayerIds(xml).sort();
  eq(layerIds.length, 659);
  eq(layerIds.slice(0, 3), [
    'geoenabler:wld_bnd_adm0_ge',
    'geonode:_01_provincias',
    'geonode:_2020_global_adm0',
  ]);
});

test('get layer names', async ({ eq }) => {
  const layerNames = getLayerNames(xml);
  eq(layerNames[0], 'Ecuador_OSM_Julio 2019');
  eq(layerNames.length, 659);
  eq(layerNames.slice(0, 3), [
    'Ecuador_OSM_Julio 2019',
    'Global administrative boundaries, level 0 (Country)',
    'Global administrative boundaries level 1',
  ]);
  eq(layerNames.sort().slice(0, 3), [
    ' Colombia - Second Level Admin Boundaries',
    '2020 Global Bnd Line',
    'Access, Poverty rate',
  ]);
});

test('cleaning layer names', ({ eq }) => {
  const layerNames = getLayerNames(xml, { clean: true }).sort();
  eq(layerNames.length, 659);
  eq(layerNames.slice(0, 3), [
    '2020 Global Bnd Line',
    'Access, Poverty rate',
    'Access: Average daily per capita protein consumption, National Statistics Committee 2013',
  ]);
});

test('get layer dates', async ({ eq }) => {
  const layerDates = getLayerDates(xml, 'prism:lka_gdacs_buffers');
  eq(layerDates, [
    '2012-10-31T12:00:00.000Z',
    '2014-01-05T18:00:00.000Z',
    '2016-12-01T12:00:00.000Z',
    '2017-12-05T06:00:00.000Z',
    '2018-11-18T18:00:00.000Z',
    '2018-12-17T12:00:00.000Z',
    '2020-11-26T00:00:00.000Z',
    '2020-12-04T18:00:00.000Z',
  ]);

  // empty array for layers without dates
  eq(getLayerDates(xml, 'geonode:landslide'), []);
});

test('parse layer', ({ eq }) => {
  const layer = findLayer(xml, 'prism:lka_gdacs_buffers');
  const result = parseLayer(layer!);
  eq(result, {
    name: 'lka_gdacs_buffers',
    namespace: 'prism',
    abstract: undefined,
    keywords: ['features', 'lka_gdacs_buffers'],
    srs: ['EPSG:4326', 'CRS:84'],
    bbox: [62.7410319289297, 5.26600000000001, 90.341501670274, 21.868],
    attribution: undefined,
    dates: [
      '2012-10-31T12:00:00.000Z',
      '2014-01-05T18:00:00.000Z',
      '2016-12-01T12:00:00.000Z',
      '2017-12-05T06:00:00.000Z',
      '2018-11-18T18:00:00.000Z',
      '2018-12-17T12:00:00.000Z',
      '2020-11-26T00:00:00.000Z',
      '2020-12-04T18:00:00.000Z',
    ],
    styles: [],
  });
});

test('createGetMapUrl', async ({ eq }) => {
  const url = createGetMapUrl(odcXml, ['ModisIndices'], {
    bbox: [
      11897270.578531113,
      6261721.357121639,
      12523442.714243278,
      6887893.492833804,
    ],
    bboxSrs: 3857,
    height: 256,
    srs: 'EPSG:3857',
    time: '2022-07-11',
    width: 256,
  });
  eq(
    url,
    'https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256',
  );
});
