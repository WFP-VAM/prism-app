from app.googleflood import get_google_floods_gauges
from app.main import app
from fastapi.testclient import TestClient
import logging, json

client = TestClient(app)

def test_get_google_floods_gauges():
    gauges = get_google_floods_gauges("BD")
    assert len(gauges) > 0
    

def test_get_google_floods_gauges_api():
    response = client.get("/google-floods-gauges?iso2=BD")
    assert response.status_code == 200
    logging.info(json.dumps(response.json()))
    # logging.info(response.json())
    assert len(response.json()) > 0
    
    