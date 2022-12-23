import { formatUrl, parseService, setTimeoutAsync } from "../utils";
import findException from "./find-exception";

export function getCapabilitiesUrl(
  url: string,
  {
    params = {},
    service,
    version,
  }: {
    params?: { [k: string]: number | string };
    service?: string;
    version?: string;
  } = { service: undefined, version: undefined }
) {
  try {
    const { origin, pathname, searchParams } = new URL(url);

    const base = origin + pathname;

    // params parsed from url
    const baseParams = Object.fromEntries(searchParams.entries());

    const paramsObj = {
      request: "GetCapabilities",
      ...baseParams,
      ...params,
      service:
        service || params?.service || parseService(url, { case: "upper" }),
      version,
    };

    if (!paramsObj.service) {
      throw new Error("unable to set service parameter");
    }

    return formatUrl(base, paramsObj);
  } catch (error) {
    throw Error(
      `getCapabilitiesUrl failed to parse "${url}" because of the following error:\n${error}`
    );
  }
}

export async function getCapabilities(
  url: string,
  {
    fetch: customFetch,
    params = {},
    service,
    version,
    wait = 0,
  }: {
    debug?: boolean;
    fetch?: any;
    params?: { [key: string]: string };
    service?: string;
    version?: string;
    wait?: number;
  } = {}
): Promise<string> {
  const run = async () => {
    const capabilitiesUrl = getCapabilitiesUrl(url, {
      params,
      service,
      version,
    });
    const response = await (customFetch || fetch)(capabilitiesUrl);

    if (response.status !== 200) {
      throw new Error(
        `fetch failed for "${capabilitiesUrl}" returning a status code of ${response.status}`
      );
    }

    const xml = await response.text();

    const exception = findException(xml);
    if (exception) {
      throw new Error(
        `fetch to "${capabilitiesUrl}" returned the following exception: "${exception}"`
      );
    }

    return xml;
  };

  return setTimeoutAsync(wait, run);
}
