import test from "flug";
import { parseEnvelope, findAndParseEnvelope } from ".";

test("gml: parseEnvelope", ({ eq }) => {
  const xml = `<gml:Envelope srsName="http://www.opengis.net/def/crs/EPSG/0/4326" axisLabels="Lat Long" uomLabels="Deg Deg" srsDimension="2">
  <gml:lowerCorner>-81.0625 -180.0625</gml:lowerCorner>
  <gml:upperCorner>81.0625 179.9375</gml:upperCorner>
  </gml:Envelope>`;
  eq(parseEnvelope(xml), [-81.0625, -180.0625, 81.0625, 179.9375]);
  eq(findAndParseEnvelope(xml), [-81.0625, -180.0625, 81.0625, 179.9375]);
});
