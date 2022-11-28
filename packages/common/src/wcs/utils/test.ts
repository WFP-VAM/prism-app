import fetch from "cross-fetch";
import findAndRead from "find-and-read";
import test from "flug";

import {
  createDescribeCoverageUrl,
  createGetCoverageUrl,
  fetchCoverageDescriptionFromCapabilities,
  findCoverageId,
  findCoverageIdentifier,
  findLayerIds,
  findCoverageName,
  findCoverageDisplayNames,
  findCoverages,
  findDescribeCoverageUrl,
  findGetCoverageUrl,
  findAndParseLonLatEnvelope,
  normalizeCoverageId,
  findLayerId,
  parseCoverage,
  parseDates,
  parseSupportedFormats,
} from ".";

import { findAndParseCapabilityUrl } from "../../utils";

const xml = findAndRead("./data/geonode-wfp-wcs-get-capabilities-2.0.1.xml", {
  encoding: "utf-8",
});

const xml100 = findAndRead(
  "./data/mongolia-sibelius-datacube-wcs-get-capabilities-1.0.0.xml",
  {
    encoding: "utf-8",
  }
);

const xmlDescription100 = findAndRead(
  "./data/geonode-wfp-wcs-describe-coverage-geonode__wld_cli_tp_7d_ecmwf-2.0.1.xml",
  { encoding: "utf-8" }
);

const xmlTemporalDescription100 = findAndRead(
  "./data/mongolia-sibelius-datacube-wcs-coverage-description-10DayTrend-1.0.0.xml",
  { encoding: "utf-8" }
);

test("wcs: find coverages", ({ eq }) => {
  const layers = findCoverages(xml);
  eq(layers.length, 15);
  eq(layers[0].startsWith("<wcs:CoverageSummary"), true);
});

test("wcs: find coverages (1.0.0.)", ({ eq }) => {
  eq(findCoverages(xml100).length, 23);
});

test("wcs: find coverage titles (or names)", ({ eq }) => {
  const layerNames = findCoverageDisplayNames(xml);
  eq(layerNames.length, 15);
  eq(layerNames[0], "Climate Outlook across Eastern Africa");
  eq(layerNames[1], "Ethiopia Elevation");
  eq(layerNames[2], "Global Total Precipitation Forecast 1 Day");
});

test("wcs: find coverage name (1.0.0)", ({ eq }) => {
  const coverageOfferingBrief = `<CoverageOfferingBrief>
  <description>MODIS Median value of Land Surface Temperature (cloud masked) in a 10days period L3 Grid 1km</description>
  <name>ModisLST</name>
  <label>mdc MODIS LST</label>
  <lonLatEnvelope srsName="urn:ogc:def:crs:OGC:1.3:CRS84">
  <gml:pos dimension="2">74.1175373640643 36.3416920409728</gml:pos>
  <gml:pos dimension="2">132.927031729918 54.472044480952</gml:pos>
  <gml:timePosition>2009-01-01</gml:timePosition>
  <gml:timePosition>2022-07-11</gml:timePosition>
  </lonLatEnvelope>
  </CoverageOfferingBrief>`;
  eq(findCoverageName(coverageOfferingBrief), "ModisLST");
});

test("wcs: find coverage display names", ({ eq }) => {
  const layerNames = findCoverageDisplayNames(xml100);
  eq(layerNames.length, 23);
  eq(layerNames.includes("mdc 10 Day Indices"), true);
});

test("wcs: find coverages", ({ eq }) => {
  eq(findCoverages(xml100).length, 23);
});

test("wcs: normalize coverage identifier", ({ eq }) => {
  eq(
    normalizeCoverageId(
      "geonode___20apr08074540_s2as_r2c3_012701709010_01_p001"
    ),
    "geonode:_20apr08074540_s2as_r2c3_012701709010_01_p001"
  );
});

test("wcs: find legacy coverage id", ({ eq }) => {
  const coverageSummary = `<wcs:CoverageSummary><ows:Title>sdn_fl_0909_noaa_40ff</ows:Title><ows:Abstract>Generated from GeoTIFF</ows:Abstract><ows:Keywords><ows:Keyword>GeoTIFF</ows:Keyword><ows:Keyword>WCS</ows:Keyword><ows:Keyword>sdn_fl_0909_noaa_40ff</ows:Keyword></ows:Keywords><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/catalogue/csw?outputschema=http%3A%2F%2Fwww.w3.org%2F2005%2FAtom&amp;service=CSW&amp;request=GetRecordById&amp;version=2.0.2&amp;elementsetname=full&amp;id=4f0ef40a-f3d7-11ea-b98c-005056822e38"/><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/catalogue/csw?outputschema=http%3A%2F%2Fgcmd.gsfc.nasa.gov%2FAboutus%2Fxml%2Fdif%2F&amp;service=CSW&amp;request=GetRecordById&amp;version=2.0.2&amp;elementsetname=full&amp;id=4f0ef40a-f3d7-11ea-b98c-005056822e38"/><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/catalogue/csw?outputschema=http%3A%2F%2Fwww.opengis.net%2Fcat%2Fcsw%2F2.0.2&amp;service=CSW&amp;request=GetRecordById&amp;version=2.0.2&amp;elementsetname=full&amp;id=4f0ef40a-f3d7-11ea-b98c-005056822e38"/><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/catalogue/csw?outputschema=urn%3Aoasis%3Anames%3Atc%3Aebxml-regrep%3Axsd%3Arim%3A3.0&amp;service=CSW&amp;request=GetRecordById&amp;version=2.0.2&amp;elementsetname=full&amp;id=4f0ef40a-f3d7-11ea-b98c-005056822e38"/><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/catalogue/csw?outputschema=http%3A%2F%2Fwww.opengis.net%2Fcat%2Fcsw%2Fcsdgm&amp;service=CSW&amp;request=GetRecordById&amp;version=2.0.2&amp;elementsetname=full&amp;id=4f0ef40a-f3d7-11ea-b98c-005056822e38"/><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/catalogue/csw?outputschema=http%3A%2F%2Fwww.isotc211.org%2F2005%2Fgmd&amp;service=CSW&amp;request=GetRecordById&amp;version=2.0.2&amp;elementsetname=full&amp;id=4f0ef40a-f3d7-11ea-b98c-005056822e38"/><ows:Metadata xlink:type="simple" xlink:href="https://geonode.wfp.org/showmetadata/xsl/11319"/><ows:WGS84BoundingBox><ows:LowerCorner>21.841787543839928 8.682217421312949</ows:LowerCorner><ows:UpperCorner>38.84678241007194 23.144724457059354</ows:UpperCorner></ows:WGS84BoundingBox><wcs:Identifier>geonode:sdn_fl_0909_noaa_40ff</wcs:Identifier></wcs:CoverageSummary>`;
  eq(findCoverageIdentifier(coverageSummary), "geonode:sdn_fl_0909_noaa_40ff");
});

test("wcs: find layer id", ({ eq }) => {
  const coverageId = `<wcs:CoverageId>geonode__sdn_fl_0909_noaa_40ff</wcs:CoverageId>`;
  eq(findCoverageId(coverageId), "geonode__sdn_fl_0909_noaa_40ff");
  eq(
    findLayerId(coverageId, { normalize: true }),
    "geonode:sdn_fl_0909_noaa_40ff"
  );
});

test("wcs: find layer ids", ({ eq }) => {
  const layerNames = findLayerIds(xml);
  eq(layerNames.length, 15);
  eq(
    layerNames.includes(
      "geonode:_20apr08074540_s2as_r2c3_012701709010_01_p001"
    ),
    true
  );
});

test("parse coverage", ({ eq }) => {
  const coverages = findCoverages(xml);
  const coverage = coverages[0];
  const result = parseCoverage(coverage);
  eq(result, {
    id: "geonode:eyxao70woaa14nh_modificado",
    name: "Climate Outlook across Eastern Africa",
    description: "Generated from GeoTIFF",
    keywords: ["WCS", "GeoTIFF", "eyxao70woaa14nh_modificado"],
    subType: "RectifiedGridCoverage",
    bbox: [
      -60.35240259408949,
      -44.9887429023503,
      80.34944659977604,
      60.53764399304885,
    ],
    wgs84bbox: [
      -52.12430934201362,
      -42.939883795000185,
      72.12135334770016,
      58.488784885698735,
    ],
  });
});

test("parse describe coverage url", ({ eq }) => {
  eq(findDescribeCoverageUrl(xml), "https://geonode.wfp.org/geoserver/wcs?");
  eq(
    findAndParseCapabilityUrl(xml100, "GetCapabilities"),
    "https://mongolia.sibelius-datacube.org:5000/wcs?"
  );
  eq(
    findDescribeCoverageUrl(xml100),
    "https://mongolia.sibelius-datacube.org:5000/wcs?"
  );
});

test("parse GetCoverage url", ({ eq }) => {
  eq(findGetCoverageUrl(xml), "https://geonode.wfp.org/geoserver/wcs?");
  eq(
    findAndParseCapabilityUrl(xml100, "GetCoverage"),
    "https://mongolia.sibelius-datacube.org:5000/wcs?"
  );
  eq(
    findGetCoverageUrl(xml100),
    "https://mongolia.sibelius-datacube.org:5000/wcs?"
  );
});

test("createDescribeCoverageUrl", ({ eq }) => {
  eq(
    createDescribeCoverageUrl(xml100, "10DayTrend"),
    "https://mongolia.sibelius-datacube.org:5000/wcs?coverage=10DayTrend&request=DescribeCoverage&service=WCS&version=1.0.0"
  );
});

test("createGetCoverageUrl", ({ eq }) => {
  const bbox = [87.7, 41.6, 119.9, 52.1] as const;
  const url = createGetCoverageUrl(xml100, "ModisLST", {
    bbox,
    height: 222,
    width: 677,
  });
  eq(
    url,
    "https://mongolia.sibelius-datacube.org:5000/wcs?bbox=87.7%2C41.6%2C119.9%2C52.1&coverage=ModisLST&crs=EPSG%3A4326&format=GeoTIFF&height=222&request=GetCoverage&service=WCS&version=1.0.0&width=677"
  );
});

test("parseSupportedFormats", ({ eq }) => {
  eq(parseSupportedFormats(xmlDescription100), []);
  eq(parseSupportedFormats(xmlTemporalDescription100), ["GeoTIFF", "netCDF"]);
});

test("parseDates", ({ eq }) => {
  eq(parseDates(xmlDescription100), []);
  const dates = parseDates(xmlTemporalDescription100);
  eq(dates.length, 29);
  eq(
    dates.every((d) => typeof d === "string"),
    true
  );
  eq(dates[0], "2019-05-21T00:00:00.000Z");
});

test("parse envelope", ({ eq }) => {
  const lonLatEnvelope = `<lonLatEnvelope srsName="urn:ogc:def:crs:OGC:1.3:CRS84">
  <gml:pos dimension="2">74.1288466392506 36.3432058634784</gml:pos>
  <gml:pos dimension="2">132.918744933946 54.4717721170595</gml:pos>
  <gml:timePosition>2009-01-01</gml:timePosition>
  <gml:timePosition>2022-07-11</gml:timePosition>
  </lonLatEnvelope>`;
  eq(findAndParseLonLatEnvelope(lonLatEnvelope), [
    74.1288466392506,
    36.3432058634784,
    132.918744933946,
    54.4717721170595,
  ]);
});

test("parse coverage (1.0.0)", ({ eq }) => {
  const coverage = findCoverages(xml100)[0];
  eq(parseCoverage(coverage), {
    bbox: undefined,
    description:
      "A set of indices spanning at 10 day/2 week/half monthly period. Contains median averaged NDVI, NDSI, NDWI &amp; NDDI products. Produced from Landsat 8 and Sentinel-2 ARD ingested to the MDC.",
    id: "10DayIndices",
    keywords: [],
    name: "mdc 10 Day Indices",
    subType: undefined,
    wgs84bbox: [
      86.7469655846003,
      41.4606540712216,
      121.185885426709,
      52.3476515518552,
    ],
  });
});

test("fetchCoverageDescriptionFromCapabilities", async ({ eq }) => {
  const result = await fetchCoverageDescriptionFromCapabilities(
    xml100,
    "10DayTrend",
    { fetch }
  );
  eq(result.length > 5000, true);
  eq(result.includes("CoverageDescription"), true);
});
