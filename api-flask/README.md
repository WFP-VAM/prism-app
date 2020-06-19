# PRISM API

The PRISM API is a lightweight API to calculate zonal statistics.

The API has two endpoints for now.

## Endpoints

### `/stats` (POST)
Calculate zonal statistics for a raster / zones combination.Which takes as inputs through POST:
- `geotiff_url`, the link to a geotiff
- `zones_url`, the link to a geojson with admin boundaries
- `?group_by`, a key to use to group zones in the geojson
- `?geojson_out`, decide if the output should be a geojson or a list of data. Default is false -> List.

### `/demo` (GET)
Exposes a sample API response and takes the following query arguments:
- `?group_by`, a key to use to group zones in the geojson, eg. `ADM1_PCODE`
- `?geojson_out`, decide if the output should be a geojson or a list of data. Default is false -> List.


## Development

To run the api locally, run:
```
make api
```

### Tests

To run linting and tests, run:
```
make test
```


## Deployments

We are using [docs.traefik.io](https://docs.traefik.io/)
To deploy the application, update the file `docker-compose.deploy.yml`.
Specifically, update `info@ovio.org` with a domain admin email and `prism-api.ovio.org` with the hostname you will be using.
