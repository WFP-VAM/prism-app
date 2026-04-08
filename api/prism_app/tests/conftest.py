"""Pytest configuration and fixtures for export_maps tests."""

import os

import prism_app.caching as caching_module
import prism_app.export_maps as export_maps_module
import pytest


@pytest.fixture(scope="session", autouse=True)
def _writable_cache_directory(tmp_path_factory: pytest.TempPathFactory) -> None:
    """Docker uses /cache; host pytest needs a temp dir so /stats tests can download rasters."""
    cache_root = tmp_path_factory.mktemp("prism_file_cache")
    caching_module.CACHE_DIRECTORY = f"{cache_root}{os.sep}"


@pytest.fixture(autouse=True)
def reset_browser_state():
    """Reset browser pool state before each test to prevent state leakage.

    The asyncio.Lock must be created within a running event loop, so we
    reset it to None before each test to force recreation.
    """
    # Reset state before test to ensure clean slate
    export_maps_module._pool = None
    export_maps_module._pool_lock = None

    yield

    # Reset state after test for isolation
    export_maps_module._pool = None
    export_maps_module._pool_lock = None
