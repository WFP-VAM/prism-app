import fetch from "cross-fetch";
import findAndRead from "find-and-read";
import test from "flug";

import {
  parseBoundingBox,
  findException,
  findOperation,
  findAndParseBoundingBox,
  findAndParseKeywords,
  findAndParseWGS84BoundingBox,
  findAndParseOperationUrl,
  getCapabilities,
  getCapabilitiesUrl,
} from "./index";

const wcsException = findAndRead("geonode-wfp-wcs-exception.xml", {
  encoding: "utf-8",
});

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
  eq(
    findAndParseWGS84BoundingBox(xml),
    [-180.0625, -81.0625, 179.9375, 81.0625],
  );
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
  eq(
    findAndParseBoundingBox(xml),
    [
      -60.35240259408949, -44.9887429023503, 80.34944659977604,
      60.53764399304885,
    ],
  );
});

test("ows: find operation and its url", ({ eq }) => {
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
    "https://geonode.wfp.org/geoserver/wcs?",
  );
});

test("ows: findException", ({ eq }) => {
  eq(
    findException(`<?xml version="1.0" encoding="UTF-8"?><ServiceExceptionReport version="1.2.0" >   <ServiceException>
  Unable to acquire a reader for this coverage with format: GeoTIFFTranslator error
Unexpected error occurred during describe coverage xml encoding
Unable to acquire a reader for this coverage with format: GeoTIFF
</ServiceException></ServiceExceptionReport>`),
    "Unable to acquire a reader for this coverage with format: GeoTIFFTranslator error\nUnexpected error occurred during describe coverage xml encoding\nUnable to acquire a reader for this coverage with format: GeoTIFF",
  );

  eq(
    findException(`<?xml version="1.0" encoding="UTF-8"?><ServiceExceptionReport version="1.2.0" >   <ServiceException>
  Could not understand version:1.0
</ServiceException></ServiceExceptionReport>`),
    "Could not understand version:1.0",
  );

  eq(
    findException(`<?xml version="1.0" encoding="UTF-8"?><ows:ExceptionReport xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ows="http://www.opengis.net/ows/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0.0" xsi:schemaLocation="http://www.opengis.net/ows/2.0 http://schemas.opengis.net/ows/2.0/owsExceptionReport.xsd">
  <ows:Exception exceptionCode="MissingParameterValue" locator="request">
  <ows:ExceptionText>Could not determine geoserver request from http request org.geoserver.monitor.MonitorServletRequest@4b7091d3</ows:ExceptionText>
  </ows:Exception>
  </ows:ExceptionReport>`),
    "Could not determine geoserver request from http request org.geoserver.monitor.MonitorServletRequest@4b7091d3",
  );

  eq(
    findException(`<?xml version="1.0" encoding="UTF-8"?><ows:ExceptionReport xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ows="http://www.opengis.net/ows/2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="2.0.0" xsi:schemaLocation="http://www.opengis.net/ows/2.0 http://schemas.opengis.net/ows/2.0/owsExceptionReport.xsd">
  <ows:Exception exceptionCode="MissingParameterValue">
  <ows:ExceptionText>Missing version</ows:ExceptionText>
  </ows:Exception>
  </ows:ExceptionReport>
  `),
    "Missing version",
  );

  const exception = findException(wcsException);
  eq(
    exception?.startsWith("java.io.IOException: Failed to create reader from"),
    true,
  );
  eq(
    exception?.endsWith("STYLE_FACTORY                    = StyleFactoryImpl"),
    true,
  );
});

test("getting capabilities url", async ({ eq }) => {
  eq(
    await getCapabilitiesUrl("https://geonode.wfp.org/geoserver/wfs"),
    "https://geonode.wfp.org/geoserver/wfs?request=GetCapabilities&service=WFS",
  );
  eq(
    await getCapabilitiesUrl(
      "https://geonode.wfp.org/geoserver/ows/?service=WFS",
    ),
    "https://geonode.wfp.org/geoserver/ows/?request=GetCapabilities&service=WFS",
  );
  eq(
    await getCapabilitiesUrl(
      "https://geonode.wfp.org/geoserver/ows/?service=WFS&extra=true",
    ),
    "https://geonode.wfp.org/geoserver/ows/?extra=true&request=GetCapabilities&service=WFS",
  );
  eq(
    await getCapabilitiesUrl("https://geonode.wfp.org/geoserver/ows", {
      service: "WFS",
    }),
    "https://geonode.wfp.org/geoserver/ows?request=GetCapabilities&service=WFS",
  );
  eq(
    await getCapabilitiesUrl(
      "https://geonode.wfp.org/geoserver/ows?service=WFS",
      {
        version: "1.1.0", // add version
      },
    ),
    "https://geonode.wfp.org/geoserver/ows?request=GetCapabilities&service=WFS&version=1.1.0",
  );
  eq(
    await getCapabilitiesUrl(
      "https://geonode.wfp.org/geoserver/ows?version=2.0.0",
      {
        service: "WFS",
        version: "1.1.1", // override
      },
    ),
    "https://geonode.wfp.org/geoserver/ows?request=GetCapabilities&service=WFS&version=1.1.1",
  );
});

test("getCapabilities", async ({ eq }) => {
  eq(
    (
      await getCapabilities("https://geonode.wfp.org/geoserver/wfs", {
        fetch,
        wait: 3,
      })
    ).length > 100,
    true,
  );
  const capabilities = await getCapabilities(
    "https://geonode.wfp.org/geoserver/wfs",
    {
      fetch,
      wait: 3,
    },
  );
  eq(capabilities.includes("<wfs:WFS_Capabilities"), true);
  eq(capabilities.includes("<ows:ServiceType>WFS</ows:ServiceType>"), true);
});
