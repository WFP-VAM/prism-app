import findAndRead from "find-and-read";
import test from "flug";
import { fetch } from "cross-fetch";

import { WFS } from "./index";

import {
  findAndParseLatLongBoundingBox,
  getFeatures,
  getFeatureTypesFromCapabilities,
  hasFeatureType,
  parseGetFeatureUrl,
  getFeaturesUrl,
  parseFullFeatureTypeNames,
} from "./utils";

const xmls = {
  "1.0.0": findAndRead("geonode-wfp-wfs-get-capabilities-1.0.0.xml", {
    encoding: "utf-8",
  }),
  "1.1.0": findAndRead("geonode-wfp-wfs-get-capabilities-1.1.0.xml", {
    encoding: "utf-8",
  }),
};

// test('setting base url', ({ eq }) => {
//   const base = "https://geonode.wfp.org/geoserver/wfs";
//   eq(getBaseUrl("https://geonode.wfp.org/geoserver/wfs"), base);
//   eq(getBaseUrl("https://geonode.wfp.org/geoserver/wfs/"), base);
//   eq(getBaseUrl("https://geonode.wfp.org/geoserver/wfs?request=GetCapabilities"), base);
// });

test("findAndParseLatLongBoundingBox", ({ eq }) => {
  const xml = `<LatLongBoundingBox minx="-81.7356205563041" miny="-4.22940646575291" maxx="-66.8472154271626" maxy="13.394727761822"/>`;
  eq(findAndParseLatLongBoundingBox(xml), [
    -81.7356205563041,
    -4.22940646575291,
    -66.8472154271626,
    13.394727761822,
  ]);
});

Object.entries(xmls).forEach(([version, xml]) => {
  test(`parsing GetFeature urls (${version})`, ({ eq }) => {
    eq(parseGetFeatureUrl(xml), "https://geonode.wfp.org/geoserver/wfs");
    eq(
      parseGetFeatureUrl(xml, { method: "GET" }),
      "https://geonode.wfp.org/geoserver/wfs"
    );
    eq(
      parseGetFeatureUrl(xml, { method: "POST" }),
      "https://geonode.wfp.org/geoserver/wfs"
    );
  });
});

Object.entries(xmls).forEach(([version, xml]) => {
  test(`getting full feature type names (aka layer ids) (${version})`, ({
    eq,
  }) => {
    // eslint-disable-next-line fp/no-mutating-methods
    eq(parseFullFeatureTypeNames(xml).sort().slice(0, 3), [
      "geoenabler:wld_bnd_adm0_ge",
      "geonode:_01_provincias",
      "geonode:_2020_global_adm0",
    ]);
  });
});

Object.entries(xmls).forEach(([version, xml]) => {
  test(`getting feature type layers (${version})`, ({ eq }) => {
    const expected = {
      name: {
        full: "geonode:col_second_level_admin_boundaries",
        namespace: "geonode",
        short: "col_second_level_admin_boundaries",
      },
      abstract:
        'This layer provides the Second Level Admin Boundaries from Colombia, this was made for the "National Administrative Department of Statistics" (DANE)',
      keywords: [
        "municipalities",
        "colombia",
        "administrative boundaries",
        "boundaries",
      ],
      srs: "EPSG:4326",
      bbox: [
        -81.7356205563041,
        -4.22940646575291,
        -66.8472154271626,
        13.394727761822,
      ],
    };
    const featureTypes100 = getFeatureTypesFromCapabilities(xml);
    eq(featureTypes100.length, 661);
    eq(featureTypes100[0], expected);
  });
});

Object.entries(xmls).forEach(([version, xml]) => {
  test(`hasFeatureType (${version})`, ({ eq }) => {
    const featureTypes = getFeatureTypesFromCapabilities(xml);
    eq(
      hasFeatureType(featureTypes, "geonode:col_second_level_admin_boundaries"),
      true
    );
    eq(
      hasFeatureType(featureTypes, "wrong:col_second_level_admin_boundaries"),
      false
    );
    eq(hasFeatureType(featureTypes, "col_second_level_admin_boundaries"), true);
    eq(
      hasFeatureType(featureTypes, "col_second_level_admin_boundaries", {
        strict: false,
      }),
      true
    );
    eq(hasFeatureType(featureTypes, "geonode:does_not_exist"), false);
    eq(
      hasFeatureType(featureTypes, "geonode:does_not_exist", { strict: true }),
      false
    );
  });
});

Object.entries(xmls).forEach(([version, xml]) => {
  test(`getFeaturesUrl (${version})`, ({ eq }) => {
    eq(
      getFeaturesUrl(xml, ["col_second_level_admin_boundaries"], {
        count: 2,
      }),
      "https://geonode.wfp.org/geoserver/wfs?count=2&outputFormat=json&request=GetFeature&service=WFS&typeNames=col_second_level_admin_boundaries&version=2.0.0"
    );
    eq(
      getFeaturesUrl(xml, "acled_incidents_syria", {
        count: 1,
        dateField: "event_date",
        dateRange: ["2020-09-18", "2022-09-20"],
      }),
      "https://geonode.wfp.org/geoserver/wfs?count=1&cql_filter=event_date+BETWEEN+2020-09-18T00%3A00%3A00+AND+2022-09-20T23%3A59%3A59&outputFormat=json&request=GetFeature&service=WFS&typeNames=acled_incidents_syria&version=2.0.0"
    );
    eq(
      getFeaturesUrl(xml, "geonode:afg_trs_roads_wfp", {
        count: Infinity,
      }),
      "https://geonode.wfp.org/geoserver/wfs?outputFormat=json&request=GetFeature&service=WFS&typeNames=geonode%3Aafg_trs_roads_wfp&version=2.0.0"
    );
  });
});

test("getFeatures (1.0.0)", async ({ eq }) => {
  const count = 5;
  const geojson = await getFeatures(xmls["1.0.0"], "acled_incidents_syria", {
    count,
    dateField: "event_date",
    dateRange: ["2020-09-01", "2022-09-30"],
    fetch,
    method: "GET",
    wait: 1,
  });
  eq(geojson.features.length, count);
  eq(geojson.numberReturned, count);
  eq(typeof geojson.numberMatched, typeof geojson.totalFeatures); // no filtering
  const feature = geojson.features[0];
  eq(feature.type, "Feature");
  eq(Object.keys(feature.properties).length > 5, true);
});

test("getFeatures (1.1.0)", async ({ eq }) => {
  const count = 5;
  const geojson = await getFeatures(xmls["1.1.0"], "acled_incidents_syria", {
    count,
    dateField: "event_date",
    dateRange: ["2020-09-01", "2022-09-30"],
    fetch,
    method: "GET",
    wait: 1,
  });
  eq(geojson.features.length, count);
  eq(geojson.numberReturned, count);
  eq(typeof geojson.numberMatched, typeof geojson.totalFeatures); // no filtering
  const feature = geojson.features[0];
  eq(feature.type, "Feature");
  eq(Object.keys(feature.properties).length > 5, true);
});

test("WFS", async ({ eq }) => {
  const instance = new WFS("https://geonode.wfp.org/geoserver/wfs", {
    fetch,
  });
  const layerIds = await instance.getLayerIds();
  eq(layerIds.length > 10, true);
  eq(layerIds.includes("geonode:_2020_global_adm3"), true);

  const layerNames = await instance.getLayerNames();
  eq(layerNames.length > 10, true);
  eq(layerNames.includes("_2020_global_adm3"), true);
  eq(
    layerNames.every((layerName) => layerName.indexOf(":") === -1),
    true
  );

  eq(await instance.hasLayerId("_2020_global_adm3"), true);
  eq(await instance.hasLayerId("_2020_global_adm3", { strict: false }), true);
  eq(await instance.hasLayerId("_2020_global_adm3", { strict: true }), false);
  eq(await instance.hasLayerId("nonexistent"), false);
  eq(await instance.hasLayerId("nonexistent", { strict: false }), false);

  let msg = "";
  try {
    await instance.checkLayer("fake");
  } catch (error) {
    // eslint-disable-next-line fp/no-mutation
    msg = `${error}`;
  }
  eq(msg.includes("does not exist"), true);

  const layerId = "_2020_global_adm3";
  const layer = await instance.getLayer(layerId);
  eq(layer.id, layerId);
  eq(typeof layer.capabilities, "object");

  const features = await layer.getFeatures({ count: 3 });
  eq(features.features.length, 3);
  eq(features.type, "FeatureCollection");
});
