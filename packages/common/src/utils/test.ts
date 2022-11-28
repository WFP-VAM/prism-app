import t from "flug";

import {
  bboxToString,
  checkExtent,
  findTagText,
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

t("findTagText", ({ eq }) => {
  eq(findTagText("<Tag>test</Tag>", "Tag"), "test");
});

t("bboxToString", ({ eq }) => {
  eq(bboxToString([-180, -90, 180, 90]), "-180,-90,180,90");
  eq(bboxToString([-180, -90, 180, 90] as const), "-180,-90,180,90");
  eq(
    bboxToString([-180.0001, -90.0001, 180.0001, 90.0001], 2),
    "-180.00,-90.00,180.00,90.00"
  );
  eq(
    bboxToString([100, 45, 103.09704125797317, 46.08568380901372]),
    "100,45,103.09704125797317,46.08568380901372"
  );
});

t("check-extent", ({ eq }) => {
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
    'Error: the extent 170,-90,150,90 seems malformed or else may contain "wrapping" which is not supported'
  );
});

t("format-url: base url with no params should return itself", ({ eq }) => {
  const baseUrl = "https://example.org/";
  eq(formatUrl(baseUrl), baseUrl);
});

t("format-url: base url should add / for root", ({ eq }) => {
  const baseUrl = "https://example.org";
  eq(formatUrl(baseUrl), `${baseUrl}/`);
});

t("format-url: skip undefined params", ({ eq }) => {
  const baseUrl = "https://example.org/path";
  const params = { a: undefined, b: 2 };
  eq(formatUrl(baseUrl, params), "https://example.org/path?b=2");
});

t("format-url: base url should add params", ({ eq }) => {
  const baseUrl = "https://mongolia.sibelius-datacube.org:5000/wms";
  const params = {
    version: "1.3.0",
    crs: "EPSG:3857",
    service: "WMS",
    request: "GetMap",
    layers: "ModisIndices",
    bbox:
      "11897270.578531113,6261721.357121639,12523442.714243278,6887893.492833804",
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
    "https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256"
  );
});

t("hasLayerId", ({ eq }) => {
  eq(hasLayerId(["ns1:name"], "ns2:name"), false);
  eq(hasLayerId(["ns1:name"], "ns1:name"), true);
  eq(hasLayerId(["ns1:name"], "name"), true);
  eq(hasLayerId(["ns1:name"], "name", { strict: true }), false);
  eq(hasLayerId(["ns1:name"], "ns1:name", { strict: true }), true);
  eq(hasLayerId(["ns1:name"], "ns2:name", { strict: true }), false);
});

t("titlecase", ({ eq }) => {
  eq(titlecase("A"), "A");
  eq(titlecase("Ab"), "Ab");
  eq(titlecase("Get"), "Get");
  eq(titlecase("GET"), "Get");
  eq(titlecase("get"), "Get");
});

t("toArray", ({ eq }) => {
  eq(toArray(null), [null]);
  eq(toArray(undefined), [undefined]);
  eq(toArray(2), [2]);
  eq(toArray({}), [{}]);
  eq(toArray([1, 2, 3]), [1, 2, 3]);
  // @ts-ignore
  eq(toArray(), []);
});

t("parsing feature type names", async ({ eq }) => {
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

t("parse service from url", async ({ eq }) => {
  eq(await parseService("https://geonode.wfp.org/geoserver/wfs"), "wfs");
  eq(
    await parseService(
      "https://example.org/geoserver/ows?request=GetCapabilities&service=WFS"
    ),
    "wfs"
  );
  eq(
    await parseService(
      "https://example.org/geoserver/ows?request=GetCapabilities&service=wfs"
    ),
    "wfs"
  );
});

t("scaleImage", async ({ eq }) => {
  const bbox = [-180, -90, 180, 90] as const;
  eq(scaleImage(bbox), { height: 2548, width: 5096 });
  eq(scaleImage(bbox, { maxPixels: 100 }), { height: 50, width: 100 });
  eq(scaleImage(bbox, { resolution: 512 }), { height: 2548, width: 5096 });
  eq(scaleImage([-180, 0, -170, 1]), { height: 26, width: 256 });
  eq(scaleImage([-180, 0, -170, 1], { resolution: 512 }), {
    height: 52,
    width: 512,
  });
});

t("setNoon", ({ eq }) => {
  eq(setNoon("2022-10-25T:08:32:12Z"), "2022-10-25T12:00:00Z");
});

t("setTimeoutAsync", async ({ eq }) => {
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
