import fetch from "cross-fetch";
import test from "flug";

import { Base } from "./index";

test("Base.getCapabilities", async ({ eq }) => {
  const base = new Base("https://geonode.wfp.org/geoserver/wfs", { fetch });
  eq(base.service, "WFS");
  const xml1 = await base.getCapabilities({ debug: true });
  const xml2 = await base.getCapabilities({ debug: true, version: "2.0.0" });

  const ows = await new Base(
    "https://geonode.wfp.org/geoserver/ows?version=2.0.0",
    {
      fetch,
      service: "WFS",
    },
  );
  const xml3 = await ows.getCapabilities({ debug: true });
  const xml4 = await ows.getCapabilities({ debug: true, version: "2.0.0" });

  // testing all the xml variables are the same using transitive property
  eq(xml1 === xml2, true);
  eq(xml2 === xml3, true);
  eq(xml3 === xml4, true);

  eq(xml1.length > 10000, true);
  eq(xml1.includes("<wfs:WFS_Capabilities"), true);
  eq(xml1.includes("<ows:ServiceType>WFS</ows:ServiceType>"), true);

  // fetch older version
  const xml5 = await base.getCapabilities({ version: "1.1.1" });
  const xml6 = await ows.getCapabilities({ version: "1.1.1" });
  eq(xml5 === xml6, true);
});

test("Base.getCapabilities with bad versions", async ({ eq }) => {
  const base = new Base("https://geonode.wfp.org/geoserver/wfs", { fetch });
  eq(base.service, "WFS");

  let msg1;
  try {
    await base.getCapabilities({ debug: true, version: "incorrect" });
    // eslint-disable-next-line prettier/prettier
  } catch (error: any) {
    // eslint-disable-next-line fp/no-mutation
    msg1 = error.message;
  }
  eq(msg1.includes("java.lang.ClassCastException"), true);

  let msg2;
  try {
    await base.getCapabilities({ debug: true, version: "123" });
    // eslint-disable-next-line prettier/prettier
  } catch (error: any) {
    // eslint-disable-next-line fp/no-mutation
    msg2 = error.message;
  }
  eq(msg2.startsWith("fetch failed"), true);
});
