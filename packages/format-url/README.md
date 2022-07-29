# format-url
Create a URL String from a Base URL and Params Object

# usage
```js
import formatUrl from "./packages/format-url";

const baseUrl = "https://example.org/api/cars";
const params = { make: "sedan", year: 2022 }
formatUrl(baseUrl, params)
// https://example.org/api/cars?make=sedan&year=2022
```
