from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any
import uuid

class Forecast(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    dataset_id: str
    target_column: str
    date_column: str
    forecast_period: int
    forecast_results: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)
