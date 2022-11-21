import fetch from "cross-fetch";
import test from "flug";
import { serve } from "srvd";
import WCS from ".";

const { port } = serve({ max: 2 });

test("WCS version 1.0.0", async ({ eq }) => {
  const wcs = new WCS(
    `http://localhost:${port}/data/mongolia-sibelius-datacube-wcs-get-capabilities-1.0.0.xml`,
    { fetch }
  );
  const layerIds = await wcs.getLayerIds();
  eq(layerIds.includes("10DayAnomaly"), true);

  const layers = await wcs.getLayers();
  eq(layers.length, 10);
});

test("WCS on version 1.1.1", async ({ eq }) => {
  const wcs = new WCS(
    `http://localhost:${port}/data/geonode-wfp-wcs-get-capabilities-1.1.1.xml`,
    { fetch }
  );
  eq(typeof wcs.fetch, "function");
  const layerIds = await wcs.getLayerIds();
  eq(
    layerIds.includes("geonode:_20apr08074540_s2as_r2c3_012701709010_01_p001"),
    true
  );

  const layerNames = await wcs.getLayerNames();
  eq(layerNames.includes("Climate Outlook across Eastern Africa"), true);

  const layer = await wcs.getLayer("geonode:wld_cli_tp_1d_ecmwf");
  const dates = await layer.getLayerDates();
  eq(dates, []);
});

test("WCS for data cube", async ({ eq }) => {
  const wcs = new WCS("https://mongolia.sibelius-datacube.org:5000/wcs", {
    fetch,
  });
  const layer = await wcs.getLayer("10DayTrend");
  const dates = await layer.getLayerDates();
  // eslint-disable-next-line no-console
  console.log("got layer dates");
  eq(dates.length, 29);
  eq(
    dates.every((d) => typeof d === "string"),
    true
  );
  eq(dates[0], "2019-05-21T00:00:00.000Z");

  const extent = await layer.getExtent();
  eq(extent, [
    86.7469655846003,
    41.4606540712216,
    117.717378164332,
    52.3174921613588,
  ]);

  // use WCS extent as bbox
  const url1 = await layer.getImageUrl({
    bboxDigits: 1,
    format: "GeoTIFF",
    height: 500,
    width: 500,
  });
  eq(
    url1,
    "https://mongolia.sibelius-datacube.org:5000/wcs?bbox=86.7%2C41.5%2C117.7%2C52.3&coverage=10DayTrend&crs=EPSG%3A4326&format=GeoTIFF&height=500&request=GetCoverage&service=WCS&version=1.0.0&width=500"
  );

  // with bbox
  const url2 = await layer.getImageUrl({
    bbox: [100, 45, 103.09704125797317, 46.08568380901372],
    format: "GeoTIFF",
    height: 222,
    width: 677,
  });
  eq(
    url2,
    "https://mongolia.sibelius-datacube.org:5000/wcs?bbox=100%2C45%2C103.09704125797317%2C46.08568380901372&coverage=10DayTrend&crs=EPSG%3A4326&format=GeoTIFF&height=222&request=GetCoverage&service=WCS&version=1.0.0&width=677"
  );

  const image = await layer.getImage({
    bbox: [100, 45, 103.09704125797317, 46.08568380901372],
    format: "GeoTIFF",
    height: 222,
    width: 677,
  });
  eq(image.constructor.name, "ArrayBuffer");
  eq(image.byteLength > 1000, true);
});
