"""Fixtures for live-deploy smoke tests.

Run with:
    BASE_URL=https://eventpark-api.onrender.com \\
    WEB_URL=https://eventpark.vercel.app \\
    pytest tests/deploy -v -m deploy
"""
import os
import pytest
import httpx


def _require(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        pytest.skip(f"{name} not set; live-deploy tests skipped")
    return val.rstrip("/")


@pytest.fixture(scope="session")
def base_url() -> str:
    return _require("BASE_URL")


@pytest.fixture(scope="session")
def web_url() -> str:
    return _require("WEB_URL")


@pytest.fixture(scope="session")
def api(base_url: str):
    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session")
def web(web_url: str):
    with httpx.Client(base_url=web_url, timeout=30.0) as client:
        yield client
