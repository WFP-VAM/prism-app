import test from "flug";
import { fetch } from "cross-fetch";
import { serve } from "srvd";

const { port } = serve({ max: 2 });

import { WMS } from ".";

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

  const layer = await client.getLayer("prism:col_gdacs_buffers");
  const dates = await layer.getLayerDates();
  eq(dates.length, 22);
  eq(dates[0], "2011-08-07T15:00:00.000Z");
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
  eq(layerNames[layerNames.length - 1],  "mdc Dzud Risk");

  const layer = await client.getLayer("ModisIndices");
  const dates = await layer.getLayerDates();
  eq(dates.length, 488);
  eq(dates[0], "2009-01-01");
  eq(dates[dates.length - 1], "2022-07-11")

  const params = {
    bbox: [11897270.578531113,6261721.357121639,12523442.714243278,6887893.492833804],
    bbox_srs: 3857,
    height: 256,
    srs: "EPSG:3857",
    time: "2022-07-11",
    width: 256
  };
  const imageUrl = await layer.getImageUrl(params);
  eq(imageUrl, "https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256");

  const { image } = await layer.getImage(params);
  eq(image.byteLength, 124189);
});
