import pytest
import schemathesis
from app.database.database import AlertsDataBase
from app.main import app
from app.scripts.add_users import add_users
from fastapi.testclient import TestClient
from hypothesis import settings


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
def add_test_users():
    add_users()


schema = schemathesis.from_asgi("/openapi.json", app)

# install all available compatibility fixups between schemathesis and fastapi
# see https://schemathesis.readthedocs.io/en/stable/compatibility.html
schemathesis.fixups.install(["fast_api"])

client = TestClient(app)


@pytest.mark.skip(reason="Slow: takes almost 10 minutes to complete")
@schema.parametrize(endpoint="^/stats")
@settings(max_examples=1)
def test_stats_api(case):
    """
    Run checks on the /stats endpoint listed in the openapi docs.

    These tests do not validate that the API returns valid results, but
    merely that it behaves according to the openAPI schema, and does not
    crash in random unexpected ways.
    This is basically fuzzying :)
    """

    response = case.call_asgi(app)
    case.validate_response(response)


@schema.parametrize(endpoint="^/alerts")
@settings(max_examples=10)
def test_alerts_api(case):
    """
    Run checks on all API endpoints listed in the openapi docs.

    These tests do not validate that the API returns valid results, but
    merely that it behaves according to the openAPI schema, and does not
    crash in random unexpected ways.
    This is basically fuzzying :)
    """

    response = case.call_asgi(app)
    case.validate_response(response)


def test_stats_endpoint1():
    """
    Call /stats with known-good parameters.
    This endpoint can be slow (>1 min) so this test is deactivated by default.
    """
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=2.0.0&coverageId=wp_pop_cicunadj&subset=Long(95.71,96.68)&subset=Lat(19.42,20.33)",
            "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mmr_admin_boundaries.json",
            "group_by": "TS_PCODE",
            "wfs_params": {
                "url": "https://geonode.wfp.org/geoserver/ows",
                "layer_name": "mmr_gdacs_buffers",
                "time": "2022-10-24",
                "key": "label",
            },
            "geojson_out": True,
        },
    )
    assert response.status_code == 200

    # Test rasterstats without geojson wfs response or empty array.
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=2.0.0&coverageId=wp_pop_cicunadj&subset=Long(95.71,96.68)&subset=Lat(19.42,20.33)",
            "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mmr_admin_boundaries.json",
            "group_by": "TS_PCODE",
            "wfs_params": {
                "url": "https://geonode.wfp.org/geoserver/ows",
                "layer_name": "mmr_gdacs_buffers",
                "time": "2022-10-11",
                "key": "label",
            },
            "geojson_out": True,
        },
    )

    assert response.status_code == 200
    assert response.json() == []


def test_stats_endpoint2():
    """
    Call /stats with known-good parameters.
    """
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=1.0.0&coverage=hfs1_sfw_mask_mmr&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098&height=2304&format=GeoTIFF&time=2022-08-12",
            "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mmr_admin_boundaries.json",
            "group_by": "TS",
            "geojson_out": False,
        },
    )
    assert response.status_code == 200


def test_stats_endpoint_masked():
    """
    Call /stats with known-good parameters with a geotiff mask.
    """
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=2.0.0&coverageId=wp_pop_cicunadj&subset=Long(95.71,96.68)&subset=Lat(19.42,20.33)",
            "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mmr_admin_boundaries.json",
            "mask_url": "https://api.earthobservation.vam.wfp.org/ows/?service=WCS&request=GetCoverage&version=1.0.0&coverage=hfs1_sfw_mask_mmr&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098&height=2304&format=GeoTIFF&time=2022-08-22",
            "group_by": "TS_PCODE",
            "geojson_out": True,
        },
    )
    assert response.status_code == 200


@pytest.mark.skip(reason="credentials required on the first 2 lines of this test")
def test_kobo_forms_endpoint(monkeypatch):
    """This test requires credentials for the kobo API."""
    # use with the following call
    # KOBO_USERNAME=xxx KOBO_PW=xxx make api-test
    monkeypatch.setenv("KOBO_USERNAME", "")
    monkeypatch.setenv("KOBO_PW", "")
    # auth_token is username:password base64 encoded
    auth_token = ""
    response = client.get(
        "/kobo/forms?beginDateTime=2022-08-18&endDateTime=2022-08-18&formId=1.%20%E1%9E%91%E1%9E%98%E1%9F%92%E1%9E%9A%E1%9E%84%E1%9F%8B%E1%9E%82%E1%9F%92%E1%9E%9A%E1%9F%84%E1%9F%87%E1%9E%91%E1%9E%B9%E1%9E%80%E1%9E%87%E1%9F%86%E1%9E%93%E1%9E%93%E1%9F%8B&datetimeField=Date_Dis&measureField=NumPeoAff&koboUrl=https://kobo.humanitarianresponse.info/api/v2/assets.json",
        headers={"authorization": f"Basic {auth_token}"},
    )
    assert response.status_code == 200
