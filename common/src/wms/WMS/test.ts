import test from "flug";
import { fetch } from "cross-fetch";
import { serve } from "srvd";

import { WMS } from ".";

const { port } = serve({ max: 2 });

test("WMS", async ({ eq }) => {
  const client = new WMS(
    `http://localhost:${port}/data/geonode-wms-get-capabilities-1.3.0.xml`,
    { fetch }
  );
  const layerIds = await client.getLayerIds();
  eq(layerIds.length, 659);
  eq(layerIds[0], "geonode:_01_provincias");

  const layerNames = await client.getLayerNames();
  eq(layerNames.length, 659);
  eq(layerNames[0], "Ecuador_OSM_Julio 2019");

  const days = await client.getLayerDays();
  eq(Object.keys(days).length, layerNames.length);
  eq(days["prism:col_gdacs_buffers"].length, 22);
  eq(
    new Date(days["prism:col_gdacs_buffers"][0]).toUTCString(),
    "Sun, 07 Aug 2011 12:00:00 GMT"
  );

  const layer = await client.getLayer("prism:col_gdacs_buffers");

  const layerDates = await layer.getLayerDates();
  eq(layerDates.length, 22);
  eq(layerDates[0], "2011-08-07T15:00:00.000Z");

  const layers = await client.getLayers();
  eq(layers.length, 659);
});

test("WMS (1.1.1)", async ({ eq }) => {
  const client = new WMS(
    `http://localhost:${port}/data/geonode-wfp-wms-get-capabilities-1.1.1.xml`,
    { fetch }
  );
  const layerIds = await client.getLayerIds();
  eq(layerIds.length, 12);
  eq(layerIds[0], "col_gdacs_buffers");

  const layerNames = await client.getLayerNames();
  eq(layerNames.length, 12);
  eq(layerNames[0], "col_gdacs_buffers");

  const days = await client.getLayerDays();
  eq(Object.keys(days).length, layerNames.length);
  eq(days.col_gdacs_buffers.length, 26);
  eq(
    new Date(days.col_gdacs_buffers[0]).toUTCString(),
    "Sun, 07 Aug 2011 12:00:00 GMT"
  );

  const layer = await client.getLayer("wld_gdacs_tc_events_nodes");

  const layerDates = await layer.getLayerDates();
  eq(layerDates.length, 1113);
  eq(layerDates[0], "2008-05-03T12:00:00.000Z");

  const layers = await client.getLayers();
  eq(layers.length, 12);

  const getImageOptions = {
    bboxSrs: 3857,
    exceptions: "application/vnd.ogc.se_inimage",
    format: "image/png" as const,
    height: 256,
    imageSrs: 3857,
    srs: "EPSG:3857",
    time: "2022-04-27",
    transparent: true,
    version: "1.1.1",
    width: 256,
    bbox: [
      5009377.085697312,
      -3130860.6785608195,
      5635549.221409474,
      -2504688.542848654,
    ],
  };

  const imageUrl = await layer.getImageUrl(getImageOptions);

  eq(
    imageUrl,
    "https://geonode.wfp.org/geoserver/prism/wms?SERVICE=WMS&amp%3B=&bbox=5009377.085697312%2C-3130860.6785608195%2C5635549.221409474%2C-2504688.542848654&bboxsr=3857&exceptions=application%2Fvnd.ogc.se_inimage&format=image%2Fpng&height=256&imagesr=3857&layers=wld_gdacs_tc_events_nodes&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-04-27&transparent=true&version=1.1.1&width=256"
  );

  const { image } = await layer.getImage(getImageOptions);
  eq(image.byteLength, 4442);
});

test("WMS Data Cube", async ({ eq }) => {
  const client = new WMS(
    `http://localhost:${port}/data/mongolia-sibelius-datacube-wms-get-capabilities-1.3.0.xml`,
    { fetch }
  );

  const layerIds = await client.getLayerIds();
  eq(layerIds.length, 23);
  eq(layerIds[0], "10DayIndices");
  eq(layerIds[layerIds.length - 1], "DzudRisk");

  const layerNames = await client.getLayerNames();
  eq(layerNames.length, 23);
  eq(layerNames[0], "mdc 10 Day Indices");
  eq(layerNames[layerNames.length - 1], "mdc Dzud Risk");

  const layer = await client.getLayer("ModisIndices");
  const dates = await layer.getLayerDates();
  eq(dates.length, 488);
  eq(dates[0], "2009-01-01");
  eq(dates[dates.length - 1], "2022-07-11");

  const params = {
    bbox: [
      11897270.578531113,
      6261721.357121639,
      12523442.714243278,
      6887893.492833804,
    ],
    bboxSrs: 3857,
    height: 256,
    srs: "EPSG:3857",
    time: "2022-07-11",
    width: 256,
  };
  const imageUrl = await layer.getImageUrl(params);
  eq(
    imageUrl,
    "https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256"
  );

  const { image } = await layer.getImage(params);
  eq(image.byteLength, 124189);
});
