import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Data Analyst Agent"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    MONGODB_URL: str = "mongodb://localhost:27017/ai_analyst_db"
    
    # JWT & Auth
    JWT_SECRET: str = "super_secret_jwt_encryption_key_for_production_analyst_agent"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # AI Keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    DEFAULT_AI_PROVIDER: str = "gemini"  # gemini, openai, groq
    
    # Storage Configuration
    STORAGE_TYPE: str = "local"  # local or s3
    STORAGE_DIR: str = "./storage"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    
    # Enable reading from .env file
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure local storage path exists
if settings.STORAGE_TYPE == "local" and not os.path.exists(settings.STORAGE_DIR):
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
