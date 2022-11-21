import test from "flug";

import {
  parseBoundingBox,
  findOperation,
  findAndParseBoundingBox,
  findAndParseKeywords,
  findAndParseWGS84BoundingBox,
  findAndParseOperationUrl,
} from "./index";

test("ows: findAndParseKeywords", ({ eq }) => {
  const xml = `<ows:Keywords>
  <ows:Keyword>a</ows:Keyword>
  <ows:Keyword>b</ows:Keyword>
  <ows:Keyword>c</ows:Keyword>
  </ows:Keywords>`;
  eq(findAndParseKeywords(xml), ["a", "b", "c"]);
});

test("ows: parseBoundingBox", ({ eq }) => {
  const xml = `<ows:WGS84BoundingBox>
  <ows:LowerCorner>-180.0625 -81.0625</ows:LowerCorner>
  <ows:UpperCorner>179.9375 81.0625</ows:UpperCorner>
  </ows:WGS84BoundingBox>`;
  eq(findAndParseWGS84BoundingBox(xml), [
    -180.0625,
    -81.0625,
    179.9375,
    81.0625,
  ]);
});

test("ows: findAndParseWGS84BoundingBox", ({ eq }) => {
  const xml = `<ows:WGS84BoundingBox>
  <ows:LowerCorner>-180.0625 -81.0625</ows:LowerCorner>
  <ows:UpperCorner>179.9375 81.0625</ows:UpperCorner>
  </ows:WGS84BoundingBox>`;
  eq(parseBoundingBox(xml), [-180.0625, -81.0625, 179.9375, 81.0625]);
});

test("ows: findAndParseBoundingBox", ({ eq }) => {
  const xml = `<ows:BoundingBox crs="http://www.opengis.net/def/crs/EPSG/0/EPSG:4326">
  <ows:LowerCorner>-60.35240259408949 -44.9887429023503</ows:LowerCorner>
  <ows:UpperCorner>80.34944659977604 60.53764399304885</ows:UpperCorner>
  </ows:BoundingBox>`;
  eq(findAndParseBoundingBox(xml), [
    -60.35240259408949,
    -44.9887429023503,
    80.34944659977604,
    60.53764399304885,
  ]);
});

test("find operation and its url", ({ eq }) => {
  const xml = `
  <wcs:Capabilities xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ogc="http://www.opengis.net/ogc" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.1.1" xsi:schemaLocation="http://www.opengis.net/wcs/1.1.1 https://geonode.wfp.org/geoserver/schemas/wcs/1.1.1/wcsGetCapabilities.xsd" updateSequence="7468">
    <ows:ServiceIdentification>
      <ows:Title>My GeoServer WCS</ows:Title>
      <ows:OperationsMetadata>
        <ows:Operation name="GetCapabilities">
          <ows:DCP>
            <ows:HTTP>
              <ows:Get xlink:href="https://geonode.wfp.org/geoserver/wcs?"/>
            </ows:HTTP>
          </ows:DCP>
          <ows:DCP>
            <ows:HTTP>
              <ows:Post xlink:href="https://geonode.wfp.org/geoserver/wcs?"/>
            </ows:HTTP>
          </ows:DCP>
        </ows:Operation>
        <ows:Operation name="DescribeCoverage">
          <ows:DCP>
            <ows:HTTP>
              <ows:Get xlink:href="https://geonode.wfp.org/geoserver/wcs?"/>
            </ows:HTTP>
          </ows:DCP>
          <ows:DCP>
            <ows:HTTP>
              <ows:Post xlink:href="https://geonode.wfp.org/geoserver/wcs?"/>
            </ows:HTTP>
          </ows:DCP>
        </ows:Operation>
      </ows:OperationsMetadata>`;
  const op = findOperation(xml, "GetCapabilities")!;
  eq(op.startsWith(`<ows:Operation name="GetCapabilities">`), true);
  eq(op.endsWith("</ows:Operation>"), true);

  eq(
    findAndParseOperationUrl(xml, "DescribeCoverage"),
    "https://geonode.wfp.org/geoserver/wcs?"
  );
});
