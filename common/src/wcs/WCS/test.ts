import fetch from "cross-fetch";
import test from "flug";
import { serve } from "srvd";
import WCS from ".";

const { port } = serve({ max: 20 });

test("WFP GeoNode", async ({ eq }) => {
  const wcs1 = new WCS(
    `https://geonode.wfp.org/geoserver/wcs?version=1.1.1&request=GetCapabilities&service=WCS`,
    { fetch }
  );

  const wcs2 = new WCS(
    `https://geonode.wfp.org/geoserver/wcs?version=2.0.1&request=GetCapabilities&service=WCS`,
    { fetch }
  );

  const layerIds1 = await wcs1.getLayerIds();
  eq(layerIds1.length >= 5, true);

  const layerIds2 = await wcs2.getLayerIds();
  eq(layerIds1.length === layerIds2.length, true);

  eq(layerIds1.includes("geonode:wld_cli_tp_7d_ecmwf"), true);
  eq(layerIds1.toString() === layerIds2.toString(), true);

  const layerNames1 = await wcs1.getLayerNames();
  const layerNames2 = await wcs2.getLayerNames();
  eq(layerNames1.includes("Global Total Precipitation Forecast 7 Days"), true);
  eq(layerNames1.toString() === layerNames2.toString(), true);
  eq(layerNames1.length === layerNames2.length, true);

  const days1 = await wcs1.getLayerDays();
  const days2 = await wcs2.getLayerDays();
  eq(
    Object.values(days1).every((days) => days.length === 0),
    true
  );
  eq(
    Object.values(days2).every((days) => days.length === 0),
    true
  );

  const layer1 = await wcs1.getLayer("geonode:wld_cli_tp_7d_ecmwf");
  const layer2 = await wcs2.getLayer("geonode:wld_cli_tp_7d_ecmwf");

  const expectedExtent = [-180.0625, -81.0625, 179.9375, 81.0625];
  eq(await layer1.getExtent(), expectedExtent);
  eq(await layer2.getExtent(), expectedExtent);

  const url = await layer1.getImageUrl({
    bboxDigits: 1,
    format: "png",
    height: 500,
    width: 500,
  });
  eq(
    url,
    "https://geonode.wfp.org/geoserver/wcs?bbox=-180.1%2C-81.1%2C179.9%2C81.1&coverage=geonode%3Awld_cli_tp_7d_ecmwf&crs=EPSG%3A4326&format=png&height=500&request=GetCoverage&service=WCS&version=1.0.0&width=500"
  );
});

test("WCS version 1.0.0", async ({ eq }) => {
  const wcs = new WCS(
    `http://localhost:${port}/data/mongolia-sibelius-datacube-wcs-get-capabilities-1.0.0.xml`,
    { fetch, service: "WCS", version: "1.0.0" }
  );
  const layerIds = await wcs.getLayerIds();
  eq(layerIds.includes("10DayAnomaly"), true);

  const layerNames = await wcs.getLayerNames();
  eq(layerNames[0], "mdc 10 Day Indices");
  eq(
    layerNames.every((layerName) => typeof layerName === "string"),
    true
  );

  const days = await wcs.getLayerDays();
  eq(Object.keys(days).length, layerNames.length);
  eq(days["10DayTrend"].length, 2);

  const layer = await wcs.getLayer("10DayTrend");
  const layerDays = await layer.getLayerDayRanges();
  eq(layerDays.length, 29);
  eq(new Date(layerDays[0]).toUTCString(), "Tue, 21 May 2019 12:00:00 GMT");
  eq(
    new Date(layerDays[layerDays.length - 1]).toUTCString(),
    "Thu, 01 Oct 2020 12:00:00 GMT"
  );
});

test("WCS on version 1.1.1", async ({ eq }) => {
  const wcs = new WCS(
    `http://localhost:${port}/data/geonode-wfp-wcs-get-capabilities-1.1.1.xml`,
    { fetch, service: "WCS", version: "1.1.1" }
  );
  eq(wcs.version, "1.1.1");
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

  // const layers = await wcs.getLayers({ count: 1e5, errorStrategy: "skip" });
  // eq(layers.length, 23);
});

test("WCS for data cube", async ({ eq }) => {
  const wcs = new WCS("https://mongolia.sibelius-datacube.org:5000/wcs", {
    fetch,
    version: "1.1.1",
  });
  const layer = await wcs.getLayer("10DayTrend");
  const dates = await layer.getLayerDates();

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

test("wcs: getLayerDays", async ({ eq }) => {
  const expectedGeoNodeDays = {
    "geonode:eyxao70woaa14nh_modificado": [],
    "geonode:eth_phy_elevation": [],
    "geonode:wld_cli_tp_1d_ecmwf": [],
    "geonode:wld_cli_tp_10d_ecmwf": [],
    "geonode:wld_cli_tp_3d_ecmwf": [],
    "geonode:wld_cli_tp_7d_ecmwf": [],
    "geonode:test_reclass": [],
    "geonode:_20apr08074540_s2as_r2c3_012701709010_01_p001": [],
    "geonode:bgd_14days_20july": [],
    "geonode:flooding": [],
    "geonode:imagen_24h_6_oct_2018_12m_modificado_1": [],
    "geonode:imagen_24h_6_oct_2018_12m_modificado_2": [],
    "geonode:imagen_24h_6_oct_2018_12m_modificado_3": [],
    "geonode:imagen_24h_6_oct_2018_12m_modificado_4": [],
    "geonode:sdn_fl_0909_noaa_40ff": [],
  };
  eq(
    await new WCS(
      `http://localhost:${port}/data/geonode-wfp-wcs-get-capabilities-1.1.1.xml`,
      { fetch }
    ).getLayerDays(),
    expectedGeoNodeDays
  );
  eq(
    await new WCS(
      `http://localhost:${port}/data/geonode-wfp-wcs-get-capabilities-2.0.1.xml`,
      { fetch }
    ).getLayerDays(),
    expectedGeoNodeDays
  );

  eq(
    await new WCS(
      `http://localhost:${port}/data/mongolia-sibelius-datacube-wcs-get-capabilities-1.0.0.xml`,
      { fetch }
    ).getLayerDays(),
    {
      "10DayIndices": [1376222400000, 1642766400000],
      MonthIndices: [1374408000000, 1655812800000],
      ModisIndices: [1230811200000, 1657540800000],
      ModisNDSI: [1230811200000, 1657540800000],
      "10DayAnomaly": [1558440000000, 1601553600000],
      MonthAnomaly: [1549022400000, 1655812800000],
      ModisAnomaly: [1230811200000, 1657540800000],
      ModisSeasonalAnomaly: [1272715200000, 1603281600000],
      "10DayTrend": [1558440000000, 1601553600000],
      MonthTrend: [1549022400000, 1655812800000],
      ModisTrend: [1231675200000, 1657540800000],
      MonthPastureBiomass: [1549022400000, 1655812800000],
      ModisPastureBiomass: [1230811200000, 1657540800000],
      ModisLST: [1230811200000, 1657540800000],
      ModisRGB: [1230811200000, 1657540800000],
      S2RGB: [1549022400000, 1646136000000],
      ModisSnowCover: [1230811200000, 1657540800000],
      MonthSnowPercentage: [1549022400000, 1655812800000],
      ModisSnowPercentage: [1230811200000, 1657540800000],
      ModisVCI: [1230811200000, 1657540800000],
      ModisTCI: [1230811200000, 1657540800000],
      ModisVHI: [1230811200000, 1657540800000],
      DzudRisk: [1448366400000, 1610280000000],
    }
  );

  const urls3 = [
    "https://api.earthobservation.vam.wfp.org/ows/wcs?service=WCS&request=GetCapabilities&version=1.0.0",
    "https://api.earthobservation.vam.wfp.org/ows/wcs?service=WCS&request=GetCapabilities&version=2.0.1",
  ];
  const layerDays3 = await Promise.all(
    urls3.map((url) => new WCS(url, { fetch }).getLayerDays())
  );
  eq(JSON.stringify(layerDays3[0]) === JSON.stringify(layerDays3[1]), true);
  eq(Object.keys(layerDays3[0]).length > 10, true);
  Object.values(layerDays3[0]).forEach((range) => {
    eq(
      range.every((day) => typeof day === "number"),
      true
    );
    if (range.length === 2) {
      eq(range[0] < range[1], true);
    }
  });
});
