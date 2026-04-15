import os
import tempfile
import uuid
from unittest.mock import MagicMock, patch

import pytest
import rasterio
from fastapi.testclient import TestClient
from prism_app.database.alert_model import AlertModel
from prism_app.database.database import AlertsDataBase, AuthDataBase
from prism_app.database.user_info_model import UserInfoModel
from prism_app.main import app
from prism_app.scripts.add_users import add_users
from sqlalchemy import text
from sqlalchemy.orm import Session


@pytest.fixture(scope="session", autouse=True)
def migrate_test_db():
    alerts_db = AlertsDataBase()
    if alerts_db.engine is None:
        pytest.skip(
            "Alerts database unavailable (PRISM_ALERTS_DATABASE_URL / Postgres)"
        )
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
    with Session(bind=alerts_db.engine) as session:
        session.execute(text(q1))
        session.execute(text(q2))
        session.commit()


@pytest.fixture(scope="session", autouse=True)
def add_test_users(migrate_test_db):  # noqa: F811
    add_users()


client = TestClient(app)


def _minimal_alert_payload(email: str, alert_name: str) -> dict:
    """Valid body for POST /alerts (Pydantic AlertsModel + DB integer min/max)."""
    return {
        "email": email,
        "prism_url": "https://example.org/prism",
        "alert_name": alert_name,
        "alert_config": {
            "id": "test-layer",
            "type": "wms",
            "title": "Test",
            "serverLayerName": "layer",
            "baseUrl": "https://example.org/ows/",
            "wcsConfig": {},
        },
        "zones": {
            "type": "FeatureCollection",
            "name": "zones",
            "features": [],
        },
        "min": 1.9,
        "max": 10.2,
    }


def test_post_alerts_persists_and_coerces_bounds(migrate_test_db):
    """SQLModel insert via API; float bounds become integers in DB."""
    token = uuid.uuid4().hex[:8]
    email = f"alerts-api-test-{token}@example.com"
    name = f"pytest_alert_{token}"
    payload = _minimal_alert_payload(email, name)

    response = client.post("/alerts", json=payload)
    assert response.status_code == 200

    db = AlertsDataBase()
    rows = list(db.read(AlertModel.email == email))
    assert len(rows) == 1
    row = rows[0]
    assert row.alert_name == name
    assert row.min == 1
    assert row.max == 10
    assert row.active is True
    assert row.zones is not None
    assert row.alert_config["id"] == "test-layer"


def test_post_alerts_validation_requires_min_or_max(migrate_test_db):
    payload = _minimal_alert_payload("x@example.com", "n")
    payload.pop("min")
    payload.pop("max")
    response = client.post("/alerts", json=payload)
    assert response.status_code == 422


def test_get_alert_by_id_success(migrate_test_db):
    token = uuid.uuid4().hex[:8]
    email = f"alerts-get-{token}@example.com"
    name = f"pytest_get_{token}"
    assert (
        client.post("/alerts", json=_minimal_alert_payload(email, name)).status_code
        == 200
    )

    db = AlertsDataBase()
    row = db.read(AlertModel.email == email)[0]
    assert row.id is not None

    r = client.get(f"/alerts/{row.id}", params={"email": email})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == email
    assert body["alert_name"] == name
    assert body["active"] is True


def test_get_alert_by_id_forbidden_wrong_email(migrate_test_db):
    token = uuid.uuid4().hex[:8]
    email = f"alerts-owner-{token}@example.com"
    assert (
        client.post("/alerts", json=_minimal_alert_payload(email, "n")).status_code
        == 200
    )
    row = AlertsDataBase().read(AlertModel.email == email)[0]

    r = client.get(f"/alerts/{row.id}", params={"email": "other@example.com"})
    assert r.status_code == 403


def test_get_alert_by_id_not_found(migrate_test_db):
    r = client.get("/alerts/999999999", params={"email": "anyone@example.com"})
    assert r.status_code == 404


def test_get_alert_deactivate(migrate_test_db):
    token = uuid.uuid4().hex[:8]
    email = f"alerts-deact-{token}@example.com"
    assert (
        client.post("/alerts", json=_minimal_alert_payload(email, "d")).status_code
        == 200
    )
    row = AlertsDataBase().read(AlertModel.email == email)[0]

    r = client.get(
        f"/alerts/{row.id}",
        params={"email": email, "deactivate": True},
    )
    assert r.status_code == 200

    refreshed = AlertsDataBase().readone(row.id)
    assert refreshed is not None
    assert refreshed.active is False


def test_auth_database_read_returns_users(migrate_test_db):
    """Regression: read() must query user_info (not alert)."""
    auth = AuthDataBase()
    if auth.engine is None:
        pytest.skip("Auth database unavailable")
    rows = auth.read(UserInfoModel.username == "admin_01")
    assert len(rows) >= 1
    assert rows[0].username == "admin_01"
    assert isinstance(rows[0].access, (dict, type(None)))


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
    #         "geotiff_url": "https://data.apps.fao.org/static/data/c3s/MAPSET/AGERA5-ET0-D/C3S.AGERA5-ET0-D.2026-01-D2.tif",
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
            "geotiff_url": "https://data.apps.fao.org/static/data/c3s/MAPSET/AGERA5-ET0-D/C3S.AGERA5-ET0-D.2026-01-D2.tif",
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
            "mask_url": "https://data.apps.fao.org/static/data/c3s/MAPSET/AGERA5-ET0-D/C3S.AGERA5-ET0-D.2026-01-D2.tif",
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
