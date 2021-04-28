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

### `/alerts-all` (GET)

Return all the alerts data that `alert` table holds

```
curl --location --request GET 'localhost:80/alerts-all' > data.json
```

### `/alerts` (GET)

Based on the parameter from request URL, this endpoint will return the matched
alert rows from DB.

- `id` return alert data that has `id`
- TODO: more GET all operations will be supported for different query cases

```
curl --location --request GET 'localhost:80/alerts?id=3'
```

### `/alerts` (POST)

One successful call will create a new entry in database `alert` table. The JSON
data should match the model defined in `AlertModel`.

```
curl --location --request POST 'localhost:80/alerts' \
--header 'Content-Type: application/json' -d @example_alert_post.json
```

## Development

To run the api locally, run:

```
make api
```

To run flask api together with database within same network, run:

```
docker-compose -f ./docker-compose.develop.yml -f ../alerting/docker-compose.yml up
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
