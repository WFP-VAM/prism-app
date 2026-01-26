import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import rasterio
from fastapi.testclient import TestClient
from prism_app.database.database import AlertsDataBase
from prism_app.main import app
from prism_app.scripts.add_users import add_users


@pytest.fixture(scope="session", autouse=True)
def migrate_test_db():
    alerts_db = AlertsDataBase()
    # TODO: find a better way to do this, instead of copying them from
    # the js migration files
    q1 = """CREATE TABLE IF NOT EXISTS "alert" (
          "id" SERIAL NOT NULL,
          "email" character varying NOT NULL,
          "prism_url" character varying NOT NULL,
          "active" boolean NOT NULL DEFAULT true,
          "alert_name" character varying,
          "alert_config" jsonb NOT NULL,
          "min" integer,
          "max" integer,
          "zones" jsonb,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          "last_triggered" TIMESTAMP,
          CONSTRAINT "PK_ad91cad659a3536465d564a4b2f" PRIMARY KEY ("id")
        )"""
    q2 = """CREATE TABLE IF NOT EXISTS "user_info" (
          "id" SERIAL NOT NULL,
          "username" character varying PRIMARY KEY,
          "password" character varying NOT NULL,
          "salt" character varying,
          "access" jsonb,
          "deployment" character varying,
          "organization" character varying,
          "email" character varying,
          "details" character varying,
          "created_at" TIMESTAMP NOT NULL DEFAULT now()
        )"""
    alerts_db.session.execute(q1)
    alerts_db.session.execute(q2)
    alerts_db.session.commit()


@pytest.fixture(scope="session", autouse=True)
def add_test_users(migrate_test_db):  # noqa: F811
    add_users()


client = TestClient(app)


def test_stats_endpoint1():
    """
    Call /stats with known-good parameters.
    This endpoint can be slow (>1 min) so this test is deactivated by default.
    """

    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://prism-wfp.s3.us-east-2.amazonaws.com/api-test/myanmar_rainfall_dekad.tif",
            "zones_url": "https://prism-wfp.s3.us-east-2.amazonaws.com/api-test/mmr_admin_boundaries.json",
            "group_by": "TS_PCODE",
            # TODO - re-add once geonode is back online.
            # "wfs_params": {
            #     "url": "https://geonode.wfp.org/geoserver/ows",
            #     "layer_name": "mmr_gdacs_buffers",
            #     "time": "2022-10-24",
            #     "key": "label",
            # },
            "geojson_out": True,
        },
    )
    assert response.status_code == 200

    # # TODO - re-add once geonode is back online.
    # # Test rasterstats without geojson wfs response or empty array.
    # response = client.post(
    #     "/stats",
    #     headers={"Accept": "application/json"},
    #     json={
    #         "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=2.0.0&coverageId=wp_pop_cicunadj&subset=Long(95.71,96.68)&subset=Lat(19.42,20.33)",
    #         "zones_url": "https://prism-wfp.s3.us-east-2.amazonaws.com/api-test/mmr_admin_boundaries.json",
    #         "group_by": "TS_PCODE",
    #         "wfs_params": {
    #             "url": "https://geonode.wfp.org/geoserver/ows",
    #             "layer_name": "mmr_gdacs_buffers",
    #             "time": "2022-10-11",
    #             "key": "label",
    #         },
    #         "geojson_out": True,
    #     },
    # )

    # assert response.status_code == 200
    # assert response.json() == []


@pytest.mark.flaky(reruns=3, reruns_delay=2)
def test_stats_endpoint2():
    """
    Call /stats with known-good parameters.
    """

    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=1.0.0&coverage=hf_water_mmr&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098&height=2304&format=GeoTIFF&time=2022-08-11",
            "zones_url": "https://prism-wfp.s3.us-east-2.amazonaws.com/api-test/mmr_admin_boundaries.json",
            "group_by": "TS",
            "geojson_out": False,
        },
    )
    assert response.status_code == 200


@pytest.mark.flaky(reruns=3, reruns_delay=2)
def test_stats_endpoint_masked():
    """
    Call /stats with known-good parameters with a geotiff mask.
    """
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://prism-wfp.s3.us-east-2.amazonaws.com/api-test/myanmar_rainfall_dekad.tif",
            "zones_url": "https://prism-wfp.s3.us-east-2.amazonaws.com/api-test/mmr_admin_boundaries.json",
            "mask_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=1.0.0&coverage=hf_water_mmr&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098&height=2304&format=GeoTIFF&time=2022-08-11",
            "group_by": "TS_PCODE",
            "geojson_out": True,
        },
    )
    assert response.status_code == 200


@pytest.mark.skip(reason="credentials required on the first 2 lines of this test")
def test_kobo_forms_endpoint(monkeypatch):
    """This test requires credentials for the kobo API."""
    # use with the following call
    # KOBO_USERNAME=xxx KOBO_PASSWORD=xxx make api-test
    monkeypatch.setenv("KOBO_USERNAME", "")
    monkeypatch.setenv("KOBO_PASSWORD", "")
    # auth_token is username:password base64 encoded
    auth_token = ""
    response = client.get(
        "/kobo/forms?beginDateTime=2022-08-18&endDateTime=2022-08-18&formId=1.%20%E1%9E%91%E1%9E%98%E1%9F%92%E1%9E%9A%E1%9E%84%E1%9F%8B%E1%9E%82%E1%9F%92%E1%9E%9A%E1%9F%84%E1%9F%87%E1%9E%91%E1%9E%B9%E1%9E%80%E1%9E%87%E1%9F%86%E1%9E%93%E1%9E%93%E1%9F%8B&datetimeField=Date_Dis&measureField=NumPeoAff&koboUrl=https://kobo.humanitarianresponse.info/api/v2/assets.json",
        headers={"authorization": f"Basic {auth_token}"},
    )
    assert response.status_code == 200


@patch("prism_app.main.get_geotiff")
def test_raster_geotiff_endpoint(get_geotiff_mock):
    """
    Call /raster_geotiff with known-good parameters.
    """
    test_url = "test.url"
    get_geotiff_mock.return_value = test_url
    response = client.post(
        "/raster_geotiff",
        headers={"Accept": "application/json"},
        json={
            "lat_min": -20,
            "long_min": -71,
            "lat_max": 21,
            "long_max": 71.1,
            "date": "2020-09-01",
            "collection": "r3h_dekad",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"download_url": test_url}


@patch("boto3.client")
@patch("prism_app.geotiff_from_stac_api.upload_to_s3")
@patch("prism_app.geotiff_from_stac_api.write_cog")
def test_raster_geotiff_endpoint_non_4326(
    mock_write_cog, mock_upload_to_s3, mock_boto3_client
):
    """
    Call /raster_geotiff with a non-4326 CRS projection.
    """
    # Construct the path to the sample GeoTIFF file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sample_tiff_path = os.path.join(
        current_dir, "raster_sample_not-norm_projection.tif"
    )

    # Create a temporary file to simulate the COG uploaded to S3
    with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as temp_file:
        temp_filename = temp_file.name

    def copy_geotiff(src_path, dst_path):
        with rasterio.open(src_path) as src:
            profile = src.profile
            profile.update(driver="GTiff")
            with rasterio.open(dst_path, "w", **profile) as dst:
                dst.write(src.read())

    # Mock the S3 client to return the temporary file path
    mock_s3_client = MagicMock()
    mock_s3_client.generate_presigned_url.return_value = temp_filename
    mock_boto3_client.return_value = mock_s3_client

    # Mock the upload_to_s3 function to copy the sample GeoTIFF to the temporary file
    def fake_upload_to_s3(file_path):
        copy_geotiff(file_path, temp_filename)

    mock_upload_to_s3.side_effect = lambda file_path: fake_upload_to_s3(file_path)

    # Mock the write_cog function to copy the sample GeoTIFF to the temporary file
    def fake_write_cog(dataset, file_path, overwrite=True):
        copy_geotiff(sample_tiff_path, file_path)

    mock_write_cog.side_effect = (
        lambda dataset, file_path, overwrite=True: fake_write_cog(
            dataset, file_path, overwrite
        )
    )

    response = client.post(
        "/raster_geotiff",
        headers={"Accept": "application/json"},
        json={
            "lat_min": -20,
            "long_min": -71,
            "lat_max": 21,
            "long_max": 71.1,
            "date": "2020-09-01",
            "collection": "mxd13a2_vim_dekad",
        },
    )

    assert response.status_code == 200
    stored_file = response.json()["download_url"]
    local_path = stored_file.replace("file://", "")

    # Verify that the file exists and has the correct CRS
    assert os.path.exists(local_path)
    with rasterio.open(local_path) as src:
        assert src.crs == rasterio.crs.CRS.from_epsg(4326)

    os.unlink(local_path)
