# ogc
API Client for OGC Web Services 

## principals:
- fail early
- async/await over callbacks
- clear error messages
- non-blocking
- json over xml

## basic usage

```js
import { wms } from "ogc";

const wmsClient = wms("https://example.org/wms");

await wmsClient.getLayerIds();

await wmsClient.getLayerNames();

const layer = await wmsClient.getLayer(layerId);

await layer.getLayerDates();
```
