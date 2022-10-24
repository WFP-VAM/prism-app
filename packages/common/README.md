# ogc
Shared Functions and Classes for PRISM

# functions
- formatUrl

# classes
- WCS
- WFS
- WMS

### formatUrl
```js
import { formatUrl } from 'common';

const baseUrl = 'https://example.org/wms';
const params = {
  version: '1.3.0',
  crs: 'EPSG:3857',
  service: 'WMS',
  request: 'GetMap',
  layers: 'ModisIndices',
  bbox:
    '11897270.578531113,6261721.357121639,12523442.714243278,6887893.492833804',
  bboxsr: '3857',
  height: 256,
  srs: 'EPSG:3857',
  time: '2022-07-11',
  transparent: true,
  width: 256,
  format: 'image/png',
};

formatUrl(baseUrl, params);
'https://example.org/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256'
```

### WCS
```js
import { WCS } from 'common';

const wcs = new WCS(
  `http://example.org/data/mongolia-sibelius-datacube-wcs-get-capabilities-1.0.0.xml`,
  { fetch },
);

await wcs.getLayerIds();
['10DayAnomaly', ...]

await wcs.getLayerNames();
['Climate Outlook across Eastern Africa', ...]

const layer = await wcs.getLayer('10DayTrend');
const dates = await layer.getLayerDates();
['2019-05-21T00:00:00.000Z', ...]

await layer.getExtent();
[
  86.7469655846003, // xmin
  41.4606540712216, // ymin
  117.717378164332, // xmax
  52.3174921613588, // ymax
]

await layer.getImageUrl({
  bboxDigits: 1,
  format: 'GeoTIFF',
  height: 500,
  width: 500,
});
'https://example.org/wcs?bbox=86.7%2C41.5%2C117.7%2C52.3&coverage=10DayTrend&crs=EPSG%3A4326&format=GeoTIFF&height=500&request=GetCoverage&service=WCS&version=1.0.0&width=500'

await layer.getImage({
  bbox: [100, 45, 103.09704125797317, 46.08568380901372],
  format: 'GeoTIFF',
  height: 222,
  width: 677,
});
ArrayBuffer[...]
```

### WFS
coming soon

### WMS
coming soon
