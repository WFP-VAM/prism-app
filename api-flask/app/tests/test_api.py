import pytest
import schemathesis
from fastapi.testclient import TestClient

from app.database.alert_database import AlertsDataBase
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def migrate_test_db():
    alerts_db = AlertsDataBase()
    # TODO: find a better way to do this, instead of copying them from
    # the js migration files
    q1 = """CREATE TABLE "alert" (
          "id" SERIAL NOT NULL,
          "email" character varying NOT NULL,
          "prism_url" character varying NOT NULL,
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
    q2 = 'ALTER TABLE "alert" ADD "active" boolean NOT NULL DEFAULT true'
    alerts_db.session.execute(q1)
    alerts_db.session.execute(q2)


schema = schemathesis.from_asgi("/openapi.json", app)

# install all available compatibility fixups between schemathesis and fastapi
# see https://schemathesis.readthedocs.io/en/stable/compatibility.html
schemathesis.fixups.install(["fast_api"])

client = TestClient(app)


@schema.parametrize()
def test_api(case):
    """
    Run checks on all API endpoints listed in the openapi docs.
    """

    response = case.call_asgi(app)
    case.validate_response(response)


@pytest.mark.skip(reason="Runs too slowly to check on every test run")
def test_stats_endpoint1():
    """
    Call /stats with known-good parameters.
    This endpoint can be slow (>1 min) so this test is deactivated by default.
    """
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://odc.ovio.org/?service=WCS&request=GetCoverage&version=2.0.0&coverageId=wp_pop_cicunadj&subset=Long(92.172747098, 101.170015055)&subset=Lat(9.671252102, 28.54553886)",
            "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mmr_admin_boundaries.json",
            "group_by": "TS_PCODE",
            "wfs_params": {
                "url": "https://geonode.wfp.org/geoserver/ows",
                "layer_name": "mmr_gdacs_buffers",
                "time": "2022-05-11",
                "key": "label",
            },
            "geojson_out": False,
        },
    )
    assert response.status_code == 200


@pytest.mark.skip(reason="Runs too slowly to check on every test run")
def test_stats_endpoint2():
    """
    Call /stats with known-good parameters.
    """
    response = client.post(
        "/stats",
        headers={"Accept": "application/json"},
        json={
            "geotiff_url": "https://odc.ovio.org/?service=WCS&request=GetCoverage&version=1.0.0&coverage=hfs1_sfw_mask_mmr&crs=EPSG%3A4326&bbox=92.2%2C9.7%2C101.2%2C28.5&width=1098&height=2304&format=GeoTIFF&time=2022-08-12",
            "zones_url": "https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mmr_admin_boundaries.json",
            "group_by": "TS",
            "geojson_out": False,
        },
    )
    assert response.status_code == 200


# from unittest.mock import patch


# @patch("app.kobo.get_kobo_params")
def test_kobo_forms_endpoint(monkeypatch):
    monkeypatch.setenv("KOBO_USERNAME", "")
    monkeypatch.setenv("KOBO_PW", "")
    response = client.get(
        "/kobo/forms?beginDateTime=2022-08-18&endDateTime=2022-08-18&formName=1.%20%E1%9E%91%E1%9E%98%E1%9F%92%E1%9E%9A%E1%9E%84%E1%9F%8B%E1%9E%82%E1%9F%92%E1%9E%9A%E1%9F%84%E1%9F%87%E1%9E%91%E1%9E%B9%E1%9E%80%E1%9E%87%E1%9F%86%E1%9E%93%E1%9E%93%E1%9F%8B&datetimeField=Date_Dis&measureField=NumPeoAff&koboUrl=https://kobo.humanitarianresponse.info/api/v2/assets.json"
    )
    print(response.content)
    assert response.status_code == 200
