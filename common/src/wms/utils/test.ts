import findAndRead from "find-and-read";
import test from "flug";

import {
  createGetMapUrl,
  createGetLegendGraphicUrl,
  findLayer,
  getLayerIds,
  getLayerNames,
  getLayerDates,
  getAllLayerDays,
  parseLayer,
  parseLayerDates,
} from ".";

const xml111 = findAndRead(
  "./data/geonode-wfp-wms-get-capabilities-1.1.1.xml",
  {
    encoding: "utf-8",
  }
);

const xml = findAndRead("./data/geonode-wms-get-capabilities-1.3.0.xml", {
  encoding: "utf-8",
});

const odcXml = findAndRead(
  "./data/mongolia-sibelius-datacube-wms-get-capabilities-1.3.0.xml",
  {
    encoding: "utf-8",
  }
);

test("get layer ids", async ({ eq }) => {
  // eslint-disable-next-line fp/no-mutating-methods
  const layerIds = getLayerIds(xml).sort();
  eq(layerIds.length, 659);
  eq(layerIds.slice(0, 3), [
    "geoenabler:wld_bnd_adm0_ge",
    "geonode:_01_provincias",
    "geonode:_2020_global_adm0",
  ]);
});

test("get layer names", async ({ eq }) => {
  const layerNames = getLayerNames(xml);
  eq(layerNames[0], "Ecuador_OSM_Julio 2019");
  eq(layerNames.length, 659);
  eq(layerNames.slice(0, 3), [
    "Ecuador_OSM_Julio 2019",
    "Global administrative boundaries, level 0 (Country)",
    "Global administrative boundaries level 1",
  ]);
  // eslint-disable-next-line fp/no-mutating-methods
  eq(layerNames.sort().slice(0, 3), [
    " Colombia - Second Level Admin Boundaries",
    "2020 Global Bnd Line",
    "Access, Poverty rate",
  ]);
});

test("cleaning layer names", ({ eq }) => {
  // eslint-disable-next-line fp/no-mutating-methods
  const layerNames = getLayerNames(xml, { clean: true }).sort();
  eq(layerNames.length, 659);
  eq(layerNames.slice(0, 3), [
    "2020 Global Bnd Line",
    "Access, Poverty rate",
    "Access: Average daily per capita protein consumption, National Statistics Committee 2013",
  ]);
});

test("parse layer dates", async ({ eq }) => {
  const layer = findLayer(xml, "prism:lka_gdacs_buffers")!;
  const layerDates = parseLayerDates(layer);
  eq(layerDates.length, 8);
  eq(layerDates[0], "2012-10-31T12:00:00.000Z");
});

test("parse layer days (1.1.1)", async ({ eq }) => {
  const layer = findLayer(xml111, "col_gdacs_buffers")!;
  const layerDays = parseLayerDates(layer);
  eq(layerDays.length, 26);
  eq(layerDays[0], "2011-08-07T15:00:00.000Z");
});

test("get layer dates", async ({ eq }) => {
  const layerDates = getLayerDates(xml, "prism:lka_gdacs_buffers");
  eq(layerDates, [
    "2012-10-31T12:00:00.000Z",
    "2014-01-05T18:00:00.000Z",
    "2016-12-01T12:00:00.000Z",
    "2017-12-05T06:00:00.000Z",
    "2018-11-18T18:00:00.000Z",
    "2018-12-17T12:00:00.000Z",
    "2020-11-26T00:00:00.000Z",
    "2020-12-04T18:00:00.000Z",
  ]);

  // empty array for layers without dates
  eq(getLayerDates(xml, "geonode:landslide"), []);
});

test("get all layer days", ({ eq }) => {
  const days = getAllLayerDays(xml);
  const layerId = "prism:lka_gdacs_buffers";
  eq(days[layerId], [
    1351684800000,
    1388923200000,
    1480593600000,
    1512475200000,
    1542542400000,
    1545048000000,
    1606392000000,
    1607083200000,
  ]);

  eq(days["geonode:landslide"], []);
});

test("parse layer", ({ eq }) => {
  const layer = findLayer(xml, "prism:lka_gdacs_buffers");
  const result = parseLayer(layer!);
  eq(result, {
    name: "lka_gdacs_buffers",
    namespace: "prism",
    abstract: undefined,
    keywords: ["features", "lka_gdacs_buffers"],
    srs: ["EPSG:4326", "CRS:84"],
    bbox: [62.7410319289297, 5.26600000000001, 90.341501670274, 21.868],
    attribution: undefined,
    dates: [
      "2012-10-31T12:00:00.000Z",
      "2014-01-05T18:00:00.000Z",
      "2016-12-01T12:00:00.000Z",
      "2017-12-05T06:00:00.000Z",
      "2018-11-18T18:00:00.000Z",
      "2018-12-17T12:00:00.000Z",
      "2020-11-26T00:00:00.000Z",
      "2020-12-04T18:00:00.000Z",
    ],
    styles: [],
  });
});

test("createGetMapUrl", async ({ eq }) => {
  const url = createGetMapUrl({
    bbox: [
      11897270.578531113,
      6261721.357121639,
      12523442.714243278,
      6887893.492833804,
    ],
    bboxSrs: 3857,
    capabilities: odcXml,
    height: 256,
    layerIds: ["ModisIndices"],
    srs: "EPSG:3857",
    time: "2022-07-11",
    width: 256,
  });
  eq(
    url,
    "https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256"
  );
});

test("createGetLegendGraphicUrl", ({ eq }) => {
  const url = createGetLegendGraphicUrl({
    base: "https://mongolia.sibelius-datacube.org:5000",
    layer: "ModisIndices",
  });
  eq(
    url,
    "https://mongolia.sibelius-datacube.org:5000/wms?format=image%2Fpng&layer=ModisIndices&legend_options=fontAntiAliasing%3Atrue%3BfontColor%3A0x2D3436%3BfontName%3ARoboto+Light%3BfontSize%3A13%3BforceLabels%3Aon%3BforceTitles%3Aon%3BgroupLayout%3Avertical%3BhideEmptyRules%3Afalse%3Blayout%3Avertical%3Bwrap%3Afalse&request=GetLegendGraphic&service=WMS"
  );
});
