from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    upload_dir: str
    invoice_dir: str
    backup_dir: str = "backups"
    app_name: str
    currency: str = "PKR"
    tax_percent: float = 16.0
    time_format: str = "12hr"  # options: "12hr" or "24hr"

    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
