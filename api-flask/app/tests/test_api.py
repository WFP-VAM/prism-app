import pytest
import schemathesis
from sqlalchemy import create_engine

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


@schema.parametrize()
def test_api(case):
    """
    Run checks on all API endpoints listed in the openapi docs.
    """

    response = case.call_asgi(app)
    case.validate_response(response)
