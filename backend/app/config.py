from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://plates:change-me@db:5432/platesdb"
    cors_origins: str = "http://localhost"
    storage_backend: str = "local"
    local_storage_path: str = "./media"
    aws_region: str = ""
    s3_bucket: str = ""
    low_confidence_threshold: float = 0.4

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
