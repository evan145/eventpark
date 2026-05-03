import importlib
import os

import pytest

import app.config as config_mod


def _reload(monkeypatch, **env):
    for k, v in env.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, v)
    return importlib.reload(config_mod)


def test_sqlite_url_passes_through(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="sqlite:///./eventpark.db")
    assert m.settings.DATABASE_URL == "sqlite:///./eventpark.db"


def test_neon_postgres_scheme_normalized(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="postgres://u:p@host/db?sslmode=require")
    assert m.settings.DATABASE_URL == "postgresql+psycopg://u:p@host/db?sslmode=require"


def test_postgresql_scheme_gets_psycopg_driver(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="postgresql://u:p@host/db")
    assert m.settings.DATABASE_URL == "postgresql+psycopg://u:p@host/db"


def test_postgresql_with_existing_driver_left_alone(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="postgresql+asyncpg://u:p@host/db")
    assert m.settings.DATABASE_URL == "postgresql+asyncpg://u:p@host/db"


def test_default_when_unset(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL=None)
    assert m.settings.DATABASE_URL.startswith("sqlite:///")
