// we use "t" instead of "test" because "test" is reserved by Jest
import t from "flug";
import formatUrl from "./index";

t("format-url: base url with no params should return itself", ({ eq }) => {
  const baseUrl = "https://example.org/";
  eq(formatUrl(baseUrl), baseUrl);
});

t("format-url: base url should add / for root", ({ eq }) => {
  const baseUrl = "https://example.org";
  eq(formatUrl(baseUrl), baseUrl + "/");
});

t("format-url: skip undefined params", ({ eq }) => {
  const baseUrl = "https://example.org/path";
  const params = { a: undefined, b: 2 };
  eq(formatUrl(baseUrl, params), "https://example.org/path?b=2");
});

t("format-url: base url should add params", ({ eq }) => {
  const baseUrl = "https://mongolia.sibelius-datacube.org:5000/wms";
  const params = {
    version: '1.3.0',
    crs: 'EPSG:3857',
    service: 'WMS',
    request: 'GetMap',
    layers: 'ModisIndices',
    bbox: '11897270.578531113,6261721.357121639,12523442.714243278,6887893.492833804',
    bboxsr: '3857',
    height: 256,
    srs: 'EPSG:3857',
    time: '2022-07-11',
    transparent: true,
    width: 256,
    format: 'image/png'
  }

  const url = formatUrl(baseUrl, params);
  eq(url, 'https://mongolia.sibelius-datacube.org:5000/wms?bbox=11897270.578531113%2C6261721.357121639%2C12523442.714243278%2C6887893.492833804&bboxsr=3857&crs=EPSG%3A3857&format=image%2Fpng&height=256&layers=ModisIndices&request=GetMap&service=WMS&srs=EPSG%3A3857&time=2022-07-11&transparent=true&version=1.3.0&width=256');
});

