from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class SystemLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level: str  # "INFO", "WARNING", "ERROR", "CRITICAL"
    message: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
