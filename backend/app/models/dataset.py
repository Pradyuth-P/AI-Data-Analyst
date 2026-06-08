from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

class Dataset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    filename: str
    file_path: str
    file_size: int
    row_count: int
    col_count: int
    columns_metadata: Dict[str, Any]
    cleaned_file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
