import findAndRead from "find-and-read";
import test from "flug";

import {
  bboxToString,
  checkExtent,
  findTagText,
  findVersion,
  formatUrl,
  hasLayerId,
  titlecase,
  toArray,
  setNoon,
  parseName,
  parseService,
  scaleImage,
  setTimeoutAsync,
} from ".";

// performance API used for timing
declare let performance: { now: () => number };

test("findTagText", ({ eq }) => {
  eq(findTagText("<Tag>test</Tag>", "Tag"), "test");
});

test("bboxToString", ({ eq }) => {
  eq(bboxToString([-180, -90, 180, 90]), "-180,-90,180,90");
  eq(bboxToString([-180, -90, 180, 90] as const), "-180,-90,180,90");
  eq(
    bboxToString([-180.0001, -90.0001, 180.0001, 90.0001], 2),
    "-180.00,-90.00,180.00,90.00",
  );
  eq(
    bboxToString([100, 45, 103.09704125797317, 46.08568380901372]),
    "100,45,103.09704125797317,46.08568380901372",
  );
});

test("check-extent", ({ eq }) => {
  eq(checkExtent([-180, -90, 180, 90]), undefined);
  let msg;
  try {
    checkExtent([170, -90, 150, 90]);
  } catch (error) {
    // eslint-disable-next-line fp/no-mutation
    msg = `${error}`;
  }
  eq(
    msg,
    'Error: the extent 170,-90,150,90 seems malformed or else may contain "wrapping" which is not supported',
  );
});

test("format-url: base url with no params should return itself", ({ eq }) => {
  const baseUrl = "https://example.org/";
  eq(formatUrl(baseUrl), baseUrl);
});

test("format-url: base url should add / for root", ({ eq }) => {
  const baseUrl = "https://example.org";
  eq(formatUrl(baseUrl), `${baseUrl}/`);
});

test("format-url: skip undefined params", ({ eq }) => {
  const baseUrl = "https://example.org/path";
  const params = { a: undefined, b: 2 };
  eq(formatUrl(baseUrl, params), "https://example.org/path?b=2");
});

test("format-url: base url should add params", ({ eq }) => {
  const baseUrl = "https://mongolia.sibelius-datacube.org:5000/wms";
  const params = {
    version: "1.3.0",
    crs: "EPSG:3857",
    service: "WMS",
    request: "GetMap",
    layers: "ModisIndices",
    bbox: "11897270.578531113,6261721.357121639,12523442.714243278,6887893.492833804",
    bboxsr: "3857",
    height: 256,
    srs: "EPSG:3857",
    time: "2022-07-11",
    transparent: true,
    width: 256,
    format: "image/png",
  };

  const url = formatUrl(baseUrl, params);
  eq(
    url,
    "https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256",
  );
});

test("hasLayerId", ({ eq }) => {
  eq(hasLayerId(["ns1:name"], "ns2:name"), false);
  eq(hasLayerId(["ns1:name"], "ns1:name"), true);
  eq(hasLayerId(["ns1:name"], "name"), true);
  eq(hasLayerId(["ns1:name"], "name", { strict: true }), false);
  eq(hasLayerId(["ns1:name"], "ns1:name", { strict: true }), true);
  eq(hasLayerId(["ns1:name"], "ns2:name", { strict: true }), false);
});

test("titlecase", ({ eq }) => {
  eq(titlecase("A"), "A");
  eq(titlecase("Ab"), "Ab");
  eq(titlecase("Get"), "Get");
  eq(titlecase("GET"), "Get");
  eq(titlecase("get"), "Get");
});

test("toArray", ({ eq }) => {
  eq(toArray(null), [null]);
  eq(toArray(undefined), [undefined]);
  eq(toArray(2), [2]);
  eq(toArray({}), [{}]);
  eq(toArray([1, 2, 3]), [1, 2, 3]);
  // @ts-ignore
  eq(toArray(), []);
});

test("parsing feature type names", async ({ eq }) => {
  eq(parseName("geonode:col_second_level_admin_boundaries"), {
    full: "geonode:col_second_level_admin_boundaries",
    namespace: "geonode",
    short: "col_second_level_admin_boundaries",
  });
  eq(parseName("col_second_level_admin_boundaries"), {
    full: "col_second_level_admin_boundaries",
    namespace: undefined,
    short: "col_second_level_admin_boundaries",
  });
  // version 1.1.1
  eq(parseName("geonode__col_second_level_admin_boundaries"), {
    full: "geonode__col_second_level_admin_boundaries",
    namespace: "geonode",
    short: "col_second_level_admin_boundaries",
  });
});

test("parse service from url", async ({ eq }) => {
  eq(parseService("https://geonode.wfp.org/geoserver/wfs"), "wfs");
  eq(
    parseService(
      "https://example.org/geoserver/ows?request=GetCapabilities&service=WFS",
      { case: "lower" },
    ),
    "wfs",
  );
  eq(
    parseService(
      "https://example.org/geoserver/ows?request=GetCapabilities&service=wfs",
    ),
    "wfs",
  );
});

test("scaleImage", async ({ eq }) => {
  const bbox = [-180, -90, 180, 90] as const;
  eq(scaleImage(bbox), { height: 2548, width: 5096 });
  eq(scaleImage(bbox, { maxPixels: 100 }), { height: 50, width: 100 });
  eq(scaleImage(bbox, { resolution: 512 }), { height: 2548, width: 5096 });
  eq(scaleImage([-180, 0, -170, 1]), { height: 26, width: 256 });
  eq(scaleImage([-180, 0, -170, 1], { resolution: 512 }), {
    height: 52,
    width: 512,
  });
  eq(
    scaleImage([87.734402, 41.581833, 119.931528001, 52.148355], {
      maxPixels: 5096,
      resolution: 64,
    }),
    { height: 222, width: 677 },
  );
});

test("setNoon", ({ eq }) => {
  eq(setNoon("2022-10-25T:08:32:12Z"), "2022-10-25T12:00:00Z");
});

test("setTimeoutAsync", async ({ eq }) => {
  const start = performance.now();
  const seconds = 2;
  let flag = false;
  await setTimeoutAsync(seconds, () => {
    // eslint-disable-next-line fp/no-mutation
    flag = true;
  });
  const duration = performance.now() - start;
  eq(Math.round(duration / 1000), seconds);
  eq(flag, true);
});

test("findVersion", ({ eq }) => {
  [
    ["api-earthobservation-vam-wfp-wcs-1.0.0.xml", "1.0.0"],
    ["api-earthobservation-vam-wfp-wcs-2.0.1.xml", "2.0.1"],
    ["geonode-wfp-wcs-get-capabilities-2.0.1.xml", "2.0.1"],
    ["geonode-wfp-wcs-get-capabilities-1.1.1.xml", "1.1.1"],
    ["geonode-wcs-describe-coverage-1.0.0.xml", "1.0.0"],
    [
      "geonode-wfp-wcs-describe-coverage-geonode__wld_cli_tp_7d_ecmwf-2.0.1.xml",
      "2.0.0",
    ],
    ["geonode-wfp-wcs-exception.xml", "1.2.0"],
    ["geonode-wfp-wms-get-capabilities-1.1.1.xml", "1.1.1"],
    ["geonode-wfp-wms-get-capabilities-1.3.0.xml", "1.3.0"],
    ["geonode-wfp-wfs-get-capabilities-1.1.0.xml", "1.1.0"],
    ["geonode-wfp-wfs-get-capabilities-2.0.0.xml", "2.0.0"],
    ["mongolia-sibelius-datacube-wcs-get-capabilities-1.0.0.xml", "1.0.0"],
    ["mongolia-sibelius-datacube-wms-get-capabilities-1.3.0.xml", "1.3.0"],
    [
      "mongolia-sibelius-datacube-wcs-coverage-description-10DayTrend-1.0.0.xml",
      "1.0.0",
    ],
  ].forEach(([filename, version]) => {
    const xml = findAndRead(filename, { encoding: "utf-8" });
    eq(findVersion(xml), version);
  });
});
