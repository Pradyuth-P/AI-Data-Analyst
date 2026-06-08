from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class Visualization(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    dataset_id: str
    name: str
    chart_type: str
    configuration: Dict[str, Any]
    is_dashboard_widget: bool = False
    grid_layout: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
