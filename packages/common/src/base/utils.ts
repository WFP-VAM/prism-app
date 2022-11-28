import { parseService, setTimeoutAsync } from "../utils";

export function getCapabilitiesUrl(
  url: string,
  {
    params = {},
    service,
    version = "1.1.1",
  }: {
    params?: { [k: string]: number | string };
    service?: string;
    version?: string;
  } = { service: undefined, version: "1.1.1" }
) {
  try {
    const urlObject = new URL(url);

    const { searchParams } = urlObject;
    searchParams.set("request", "GetCapabilities");

    if (service) {
      searchParams.set("service", service);
    } else {
      const parsedService = parseService(url);
      if (!parsedService) {
        throw new Error("unable to parse service parameter");
      }
    }
    urlObject.searchParams.set("version", version);
    Object.entries(params).forEach(([k, v]) => {
      urlObject.searchParams.set(k, v.toString());
    });
    return urlObject.toString();
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
    version = "1.1.1",
    wait = 0,
  }: {
    fetch?: any;
    params?: { [key: string]: string };
    service?: string;
    version?: string;
    wait?: number;
  } = {}
) {
  const run = async () => {
    const capabilitiesUrl = getCapabilitiesUrl(url, {
      params,
      service,
      version,
    });
    const response = await (customFetch || fetch)(capabilitiesUrl);

    if (response.status !== 200) {
      throw new Error("error getting capabilities");
    }

    const xml = await response.text();

    return xml;
  };

  return setTimeoutAsync(wait, run);
}
