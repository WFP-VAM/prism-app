from app.googleflood import get_google_floods_gauges, get_google_floods_inundations
from app.main import app
from fastapi.testclient import TestClient
import logging, json

client = TestClient(app)


def test_get_google_floods_gauges():
    gauges = get_google_floods_gauges("BD")
    assert len(gauges) > 0
    

def test_get_google_floods_inundations():
    floods = get_google_floods_inundations("BD")
    assert floods.shape[0] > 0
    

def test_get_google_floods_gauges_api():
    response = client.get("/google-floods-gauges?iso2=BD")
    assert response.status_code == 200
    assert len(response.json()) > 0
    

def test_get_google_floods_inundation_api():
    response = client.get(f"/google-floods-inundations?iso2=BD")
    assert response.status_code == 200
    assert len(response.json()) > 0