from app.googleflood import get_google_floods_gauges, get_google_floods_inundations
from app.main import app
from fastapi.testclient import TestClient
import logging, json

client = TestClient(app)

test_inundation_map_set = [{'level': 'HIGH', 'serializedPolygonId': '9631a3143f2543ae9664c4fba7298931'}, {'level': 'MEDIUM', 'serializedPolygonId': '93444f067f42409493fd907b2b0323b7'}, {'level': 'LOW', 'serializedPolygonId': '757ac60c06ea481aba384201a107d611'}]
test_inundation_map_set_jsonstr = json.dumps(test_inundation_map_set)

def test_get_google_floods_gauges():
    gauges = get_google_floods_gauges("BD")
    assert len(gauges) > 0
    

def test_get_google_floods_inundations():
    floods = get_google_floods_inundations(test_inundation_map_set)
    assert floods.shape[0] > 0
    

def test_get_google_floods_gauges_api():
    response = client.get("/google-floods-gauges?iso2=BD")
    assert response.status_code == 200
    assert len(response.json()) > 0
    

def test_get_google_floods_inundation_api():
    response = client.get(f"/google-floods-inundations?inundationMapSet_JSONString={test_inundation_map_set_jsonstr}")
    assert response.status_code == 200
    logging.info(json.dumps(response.json()))
    # logging.info(response.json())
    assert len(response.json()) > 0