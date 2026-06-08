from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    dataset_id: str
    name: str
    format: str
    file_path: str
    report_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
