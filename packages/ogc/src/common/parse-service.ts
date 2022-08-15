// parse service from a url
export default async function parseService(
  url: string,
  { raw = false } = { raw: false }
) {
  const { pathname, searchParams } = new URL(url);

  if (searchParams.has("service") && searchParams.get("service") !== "") {
    const service = searchParams.get("service")!; // we know it's not null because of searchParams.has('service')
    return raw ? service : service.toLowerCase();
  }

  const match = /(wcs|wfs|wms|wmts|wps)\/?$/i.exec(pathname);
  if (match) {
    const service = match[0];
    return raw ? service : service.toLowerCase();
  }
}
