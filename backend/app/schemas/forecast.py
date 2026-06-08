from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, UUID4

class ForecastRequest(BaseModel):
    dataset_id: UUID4
    target_column: str
    date_column: str
    forecast_period: int = 30  # Default 30 periods/days

class ForecastResponse(BaseModel):
    id: UUID4
    dataset_id: UUID4
    target_column: str
    date_column: str
    forecast_period: int
    forecast_results: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
