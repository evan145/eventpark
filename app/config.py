import os


def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings:
    DATABASE_URL: str = _normalize_db_url(
        os.environ.get("DATABASE_URL", "sqlite:///./eventpark.db")
    )
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    RATE_LIMIT: str = os.environ.get("RATE_LIMIT", "100/minute")
    HTTPS_REDIRECT: bool = os.environ.get("HTTPS_REDIRECT", "false").lower() == "true"
    MAX_PHOTO_BYTES: int = 10 * 1024 * 1024
    ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.environ.get("ALLOWED_ORIGINS", "").split(",")
        if o.strip()
    ]


settings = Settings()
