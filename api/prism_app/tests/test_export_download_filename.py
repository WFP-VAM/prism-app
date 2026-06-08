"""Unit tests for server-side map export download filename derivation."""

from prism_app.export_jobs.download_filename import (
    build_map_export_download_filename,
    map_export_download_filename_from_payload,
)


def test_build_filename_single_date_pdf():
    urls = ["https://example.com/export?hazardLayerIds=my_layer&date=2025-06-03"]
    name = build_map_export_download_filename(
        country="Mozambique",
        layer_id="my_layer",
        urls=urls,
        format_type="pdf",
    )
    assert name == "Mozambique_my_layer_2025_06_03.pdf"


def test_build_filename_range_zip():
    urls = [
        "https://x/?hazardLayerIds=a_dekad&date=2025-04-01",
        "https://x/?hazardLayerIds=a_dekad&date=2025-04-21",
    ]
    name = build_map_export_download_filename(
        country="moz",
        layer_id="precip_blended_dekad",
        urls=urls,
        format_type="png",
    )
    assert name == "moz_precip_blended_dekad_2025_04_01_to_2025_04_21.zip"


def test_build_filename_includes_admin_area_when_masked():
    urls = ["https://example.com/export?hazardLayerIds=my_layer&date=2025-06-03"]
    name = build_map_export_download_filename(
        country="mozambique",
        layer_id="my_layer",
        urls=urls,
        format_type="pdf",
        admin_area="Cabo_Delgado",
    )
    assert name == "mozambique_Cabo_Delgado_my_layer_2025_06_03.pdf"


def test_map_export_download_filename_from_payload_includes_country():
    payload = {
        "urls": ["http://localhost/?hazardLayerIds=x_layer&date=2025-01-01"],
        "viewportWidth": 1200,
        "viewportHeight": 849,
        "format": "pdf",
        "country": "  My Place  ",
    }
    assert map_export_download_filename_from_payload(payload) == (
        "My Place_x_layer_2025_01_01.pdf"
    )


def test_map_export_download_filename_from_payload_includes_admin_area():
    payload = {
        "urls": ["http://localhost/?hazardLayerIds=x_layer&date=2025-01-01"],
        "viewportWidth": 1200,
        "viewportHeight": 849,
        "format": "pdf",
        "country": "mozambique",
        "adminArea": "Cabo_Delgado",
    }
    assert map_export_download_filename_from_payload(payload) == (
        "mozambique_Cabo_Delgado_x_layer_2025_01_01.pdf"
    )
