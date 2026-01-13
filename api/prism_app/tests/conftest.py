"""Pytest configuration and fixtures for export_maps tests."""

import prism_app.export_maps as export_maps_module
import pytest


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
