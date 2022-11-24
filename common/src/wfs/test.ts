import findAndRead from "find-and-read";
import test from "flug";
import { fetch } from "cross-fetch";

import { WFS } from "./index";

import {
  getFeatures,
  getFeatureTypesFromCapabilities,
  hasFeatureType,
  parseGetFeatureUrl,
  getFeaturesUrl,
  parseFullFeatureTypeNames,
} from "./utils";

const capabilities = findAndRead(
  "./data/geonode-wfp-wfs-get-capabilities-1.1.0.xml",
  {
    encoding: "utf-8",
  }
);

// test('setting base url', ({ eq }) => {
//   const base = "https://geonode.wfp.org/geoserver/wfs";
//   eq(getBaseUrl("https://geonode.wfp.org/geoserver/wfs"), base);
//   eq(getBaseUrl("https://geonode.wfp.org/geoserver/wfs/"), base);
//   eq(getBaseUrl("https://geonode.wfp.org/geoserver/wfs?request=GetCapabilities"), base);
// });

test("parsing GetFeature urls", async ({ eq }) => {
  eq(parseGetFeatureUrl(capabilities), "https://geonode.wfp.org/geoserver/wfs");
  eq(
    parseGetFeatureUrl(capabilities, { method: "GET" }),
    "https://geonode.wfp.org/geoserver/wfs"
  );
  eq(
    parseGetFeatureUrl(capabilities, { method: "POST" }),
    "https://geonode.wfp.org/geoserver/wfs"
  );
});

test("getting full feature type names (aka layer ids)", async ({ eq }) => {
  // eslint-disable-next-line fp/no-mutating-methods
  eq(parseFullFeatureTypeNames(capabilities).sort().slice(0, 3), [
    "geoenabler:wld_bnd_adm0_ge",
    "geonode:_01_provincias",
    "geonode:_2020_global_adm0",
  ]);
});

// to-do: default bbox to numbers
test("getting feature types (i.e. layers)", async ({ eq }) => {
  const featureTypes = await getFeatureTypesFromCapabilities(capabilities);
  eq(featureTypes.length, 652);
  eq(featureTypes[0], {
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
    srs: "urn:x-ogc:def:crs:EPSG:4326",
    bbox: [
      -81.7356205563041,
      -4.22940646575291,
      -66.8472154271626,
      13.394727761822,
    ],
  });
});

test("hasFeatureType", async ({ eq }) => {
  const featureTypes = await getFeatureTypesFromCapabilities(capabilities);
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

test("getFeaturesUrl", async ({ eq }) => {
  eq(
    getFeaturesUrl(capabilities, ["col_second_level_admin_boundaries"], {
      count: 2,
    }),
    "https://geonode.wfp.org/geoserver/wfs?count=2&outputFormat=json&request=GetFeature&service=WFS&typeNames=col_second_level_admin_boundaries&version=2.0.0"
  );
  eq(
    getFeaturesUrl(capabilities, "acled_incidents_syria", {
      count: 1,
      dateField: "event_date",
      dateRange: ["2020-09-18", "2022-09-20"],
    }),
    "https://geonode.wfp.org/geoserver/wfs?count=1&cql_filter=event_date+BETWEEN+2020-09-18T00%3A00%3A00+AND+2022-09-20T23%3A59%3A59&outputFormat=json&request=GetFeature&service=WFS&typeNames=acled_incidents_syria&version=2.0.0"
  );
  eq(
    getFeaturesUrl(capabilities, "geonode:afg_trs_roads_wfp", {
      count: Infinity,
    }),
    "https://geonode.wfp.org/geoserver/wfs?outputFormat=json&request=GetFeature&service=WFS&typeNames=geonode%3Aafg_trs_roads_wfp&version=2.0.0"
  );
});

test("getFeatures", async ({ eq }) => {
  const count = 5;
  const geojson = await getFeatures(capabilities, "acled_incidents_syria", {
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
