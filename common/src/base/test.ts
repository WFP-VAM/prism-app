import fetch from "cross-fetch";
import test from "flug";
import { getCapabilities, getCapabilitiesUrl } from "./utils";

test("getting capabilities url", async ({ eq }) => {
  eq(
    await getCapabilitiesUrl("https://geonode.wfp.org/geoserver/wfs"),
    "https://geonode.wfp.org/geoserver/wfs?request=GetCapabilities&version=1.1.1"
  );
  eq(
    await getCapabilitiesUrl(
      "https://geonode.wfp.org/geoserver/ows/?service=WFS"
    ),
    "https://geonode.wfp.org/geoserver/ows/?service=WFS&request=GetCapabilities&version=1.1.1"
  );
  eq(
    await getCapabilitiesUrl(
      "https://geonode.wfp.org/geoserver/ows/?service=WFS&extra=true"
    ),
    "https://geonode.wfp.org/geoserver/ows/?service=WFS&extra=true&request=GetCapabilities&version=1.1.1"
  );
  eq(
    await getCapabilitiesUrl("https://geonode.wfp.org/geoserver/ows", {
      service: "WFS",
    }),
    "https://geonode.wfp.org/geoserver/ows?request=GetCapabilities&service=WFS&version=1.1.1"
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
    true
  );
  const capabilities = await getCapabilities(
    "https://geonode.wfp.org/geoserver/wfs",
    {
      fetch,
      wait: 3,
    }
  );
  eq(capabilities.includes("<wfs:WFS_Capabilities"), true);
  eq(capabilities.includes("<ows:ServiceType>WFS</ows:ServiceType>"), true);
});
