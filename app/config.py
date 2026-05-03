import os


class Settings:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./eventpark.db")
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    RATE_LIMIT: str = os.environ.get("RATE_LIMIT", "100/minute")
    HTTPS_REDIRECT: bool = os.environ.get("HTTPS_REDIRECT", "false").lower() == "true"
    MAX_PHOTO_BYTES: int = 10 * 1024 * 1024


settings = Settings()
