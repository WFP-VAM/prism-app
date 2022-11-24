# WFP PRISM Frontend

This project is the front-end interface for the World Food Programme's [PRISM project](https://innovation.wfp.org/project/prism). It displays data and impact projections on a configurable map interface.

![](/docs/assets/prism_frontend.png)

## Functionalities

The new PRISM frontend is built as a static website to minimize cross dependencies and simplify deployments as much as possible. Currently, PRISM frontend provides the ability to:

- Load administrative boundaries as GeoJSON (`src/config/admin_boundaries.json`)
- Load admin level (vector) data as JSON, and link it to administrative boundaries
- Display WMS layers from Geoserver or Open Data Cube endpoints, with date selection capabilities
- Display point layers by applying symbology to numeric values associated with a geographic coordinate
- Display CSV tables in a left side panel

To chose which country to run PRISM for, you can set the environment variable `REACT_APP_COUNTRY`. The current default country is `mozambique`

## Configuration

The configuration is split into three files that you can find in `src/config`:

- 1. `prism.json`
- 2. `layers.json`
- 3. `tables.json`

### prism.json

This is the primary configuration file. You can define:

- Map settings (starting point, zoom, default boundary layers)
- The server endpoints
- Categories and their respective icons which are used to organize the top navigation
- Alerts flag (to specify whether to activate the alerts module)

For each category, you can define sub categories as "subcategorie_name":
[layers], a list of layers from `layers.json`.

```
{
  "country": "Cambodia",
    "map": {
    "latitude": 12.058,
    "longitude": 105.281,
    "zoom": 6.49
  },
    "serversUrls": {
    "wms": [
      "https://geonode.wfp.org/geoserver/prism/wms/",
      "https://ows.earthobservation.vam.wfp.org/wms"
    ]
  },
  "alertFormActive": false,
  "icons": {
    "vulnerability": "icon_vulnerable.png",
    "exposure": "icon_basemap.png",
    "hazards": "icon_climate.png",
    "risk": "icon_impact.png",
    "capacity": "icon_capacity.png",
    "tables": "icon_table.png"
  },
    "categories": {
      "hazards": {
        "floods" ....
```

#### Map settings

For each country, you will need to specify the starting point (lat, long) and zoom. In addition, you can also set

- maxBounds
- minZoom
- maxZoom

To find these attributes, we created a help mode that you can activate by setting the env `REACT_APP_SHOW_MAP_INFO=true`

#### Boundary layers

- Configuring multiple boundary layers
  If multiple boundary layers are configured `layers.json` you can specify which should be displayed by default by defining `defaultDisplayBoundaries` as an array of boundaries.

  e.g.

  ```json
  {
    ...
    "defaultDisplayBoundaries": [
      "township_boundaries",
      "district_boundaries",
      "state_boundaries"
    ]
    ...
  }
  ```

### layers.json

There are 4 main types of layers:

#### raster

These layers are simply processed as raster images from a WMS server and are referred to as type 'wms'

```
"pasture_anomaly": {
    "title": "Pasture anomaly",
    "server_type": "wms",
    "server_layer": "ModisAnomaly",
    "server_uri": "https://mongolia.sibelius-datacube.org:5000/wms?layers=ModisAnomaly",
    "has_date": true,
    "date_interval": "days",
    "opacity": 0.3,
    "legend_text": "Converts  NDVI to pasture (kg/ha) values and divides the current period by the long term average to calculate pasture anomaly.",
    "legend": [
        { "value": "12000", "color": "#ff0000" },
        { "value": "14000", "color": "#ff5900" },
        { "value": "16000", "color": "#ff8400" },
        { "value": "18000", "color": "#ffce63" },
        { "value": "19000", "color": "#ffdd94" },
        { "value": "20000", "color": "#ffffbf" },
        { "value": "21000", "color": "#dee09f" },
        { "value": "22000", "color": "#bbbf7c" },
        { "value": "24000", "color": "#9da360" },
        { "value": "26000", "color": "#7e8745" },
        { "value": "28000", "color": "#5b6e00" }
    ]
}
```

#### vector

These layers are referred to as `admin_level_data` in PRISM and represent a data value for a polygon. The layers are obtained by matching data from the `data_field` and `admin_code` fields of the `admin_level_data` layer with the administrative boundaries. The default admin boundary file will be used unless otherwise specifed in the `admin_level_data` configuration using the `boundary` attribute

```
  "improved_drinking_water": {
    "title": "Improved drinking water",
    "type": "admin_level_data",
    "path": "data/myanmar/nso/vulnerability-layers.json",
    "data_field": "improved_drinking_water",
    "admin_level": 3,
    "admin_code": "TS_PCODE",
    "opacity": 0.7,
    "legend": [
      { "label": "<20%", "value": 0, "color": "#a50f15" },
      { "label": "21 to 40%", "value": 21, "color": "#de2d26" },
      { "label": "41 to 60%", "value": 41, "color": "#fb6a4a" },
      { "label": "61 to 80%", "value": 61, "color": "#fcae91" },
      { "label": "81 to 100%", "value": 81, "color": "#fee5d9" }
    ],
    "legend_text": "Percent of households with improved source of drinking water. Source: Myanmar Population and Housing Census 2014, Department of Population, Ministry of Immigration and Population"
  }
```

#### point

These layers are referred to as `point_data` in PRISM and represent a data value for a given latitude and longitude coordinate. Point data layers visualize values specified as `measure_field` as points on a map based on the `geom_field` which expect a lat, long coordinate.

```
  "disaster_report": {
    "title": "Disaster impact report",
    "type": "point_data",
    "data": "https://prism-api.ovio.org/kobo/forms",
    "additional_query_params": {
      "form_name": "PRISM-KHM-Disaster-Report-v1",
      "datetime_field": "disaster_date",
      "geom_field": "location",
      "measure_field": "num_ppl_affected",
    }
    "opacity": 0.9,
    "legend_text": "Number of people affected",
    "legend": [
      {"value": "0", "color": "#909090"},
      {"value": "< 100", "color": "#ffeda0"},
      {"value": "100 - 500", "color": "#feb24c"},
      {"value": "500 or more", "color": "#f03b20"}
    ]
```

#### boundaries

Boundary layers are loaded by defaul when the application starts and typically show administrative boundaries and are defined as type `boundary`. Multiple boundary files can be configured in layers.json. Multiple boundary files can be used to create different styles for each boundary, or to toggle between admin_level_data layers which correspond to a separate geographic specification; for example to use one boundary file for district level data, and another boundary file for ecological data.

When more than one boundary is specified, an array of boundaries needs to also be set in `prism.json` using with the `defaultDisplayBoundaries` attribute.

```
{
  "state_admin_boundaries": {
    "type": "boundary",
    "path": "data/myanmar/mmr_admin1_boundaries.json",
    "opacity": 0.8,
    "admin_code": "ST_PCODE",
    "admin_level_names": ["ST"],
    "admin_level_local_names": ["mmr_polbnd"],
    "styles:": {
      "fill": {
        "fill-opacity": 0
      },
      "line": {
        "line-color": "gray",
        "line-width": 1.5,
        "line-opacity": 0.8
      }
    }
  },
  "district_admin_boundaries": {
    "type": "boundary",
    "path": "data/myanmar/mmr_admin2_boundaries.json",
    "opacity": 0.8,
    "admin_code": "DT_PCODE",
    "admin_level_names": ["ST", "DT"],
    "admin_level_local_names": ["DT_MMR4", "TS_MMR4"],
    "styles:": {
      "fill": {
        "fill-opacity": 0
      },
      "line": {
        "line-color": "gray",
        "line-width": 1,
        "line-opacity": 0.8
      }
    }
  },
  "admin_boundaries": {
    "type": "boundary",
    "path": "data/myanmar/admin_boundaries.json",
    "opacity": 0.8,
    "admin_code": "TS_PCODE",
    "admin_level_names": ["ST", "DT", "TS"],
    "admin_level_local_names": ["mmr_polbnd", "DT_MMR4", "TS_MMR4"],
    "styles:": {
      "fill": {
        "fill-opacity": 0
      },
      "line": {
        "line-color": "gray",
        "line-width": 0.5,
        "line-opacity": 0.8
      }
    }
  }
```

#### impact

Impact layers are computed by combining a raster layer with a vector layer based on raster values bound by the zones of the vector layer. The impact layer computes zonal statistics for the raster, and based on a configured threshold, will display zones where the threshold has been exceeded.

```
"herd_pasture_impact": {
    "title": "Number of herder households exposed to severe pasture anomaly",
    "hazard_layer": "pasture_anomaly",
    "baseline_layer": "nsoHerders",
    "threshold": " <= 25000",
    "opacity": 0.3,
    "legend_text": "Number of herder households within ADMIN2 in an area where the median pasture anomaly is <= -50%",
    "legend": [
      { "value": "25", "color": "#ffeda0”" },
      { "value": "30", "color": "#feb24c”" },
      { "value": "35", "color": "#f03b20”" }
    ]
}
```

### Additional layer content

#### Add Layer Contents

To display additional metadata about a layer, you can add a `content_path` attribute to any layer. The attribute expects a path to a `.md` or `.html` file that is stored in `public/data/${REACT_APP_COUNTRY}/filename.ext` directory. For example: `public/data/myanmar/contents.md`
The application will show an icon next to the layer in the legend if this attribute is configured, and will display the content in a modal window if the icon is clicked.

## Technical - Packages/Dependencies

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app), using the [Redux](https://redux.js.org/) and [Redux Toolkit](https://redux-toolkit.js.org/) template with TypeScript.

- **Styling & UI Library** Use [Material UI](https://material-ui.com/). Note that to use the [styles API](https://material-ui.com/styles/basics/) you can `import @material-ui/core/styles`.
- **Routing** Uses [React Router](https://reacttraining.com/react-router/web/guides/quick-start).
- **Monitoring** Uses [Sentry.io](https://sentry.io). To send monitoring info to Sentry, simply set the `Sentry` url by adding it as `REACT_APP_SENTRY_URL` in a `.env` file at the root folder.
- **State Management** Uses [Redux](https://redux.js.org/introduction/getting-started)
- **Testing** Uses [Jest](https://jestjs.io/) with [Enzyme](https://enzymejs.github.io/enzyme/)
- **Mapping** Uses [MapLibre](https://maplibre.org/maplibre-gl-js-docs/api/). The app supports Maptiler and Mapbox styles. To use Mapbox styles, you will need to create a token and add it as `REACT_APP_MAPBOX_TOKEN` in a `.env` file at the root folder. Then specify your style url using `REACT_APP_DEFAULT_STYLE`.
- **WFP authentication** Uses [msal](https://github.com/AzureAD/microsoft-authentication-library-for-js). You need to include within your .env file the variables `REACT_APP_OAUTH_CLIENT_ID`, `REACT_APP_OAUTH_AUTHORITY` and `REACT_APP_OAUTH_REDIRECT_URI`. Also, set the `WFPAuthRequired` flag within the country prism.json file

### Available Scripts

In the project directory, you can run:

#### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

#### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

#### `yarn lint`

Runs `eslint` for all the source files. We use a custom Eslint configuration in `./eslintrc` along with [`prettier`](https://prettier.io/) (configured with `./.prettierrc`) to enforce consistency and code quality. If you would like eslint to try to automatically "fix" files if it can, run `yarn lint --fix`.

### Committing Code

By default, a pre-commit hook is defined to run linting tasks on all _staged_ code before allowing a commit. This occurs using the [lint-staged](https://github.com/okonet/lint-staged) package, and can be configured in `./package.json#lint-staged`. The precommit task can be run manually using `yarn precommit`.

### Creating pull request and deploying on Surge

By default, everytime a pull request is created, a CI/CD pipeline will run tests and deploy the code on a surge page (http://prism-[pr number].surge.sh). To specify a country that the build will be run on, start your pull request title with `COUNTRY=[country name]`. For example: `COUNTRY=cambodia Add new config options`.
