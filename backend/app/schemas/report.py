from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, UUID4

class ReportRequest(BaseModel):
    dataset_id: UUID4
    name: str
    format: str = "pdf"  # "pdf" or "docx"
    include_sections: Optional[Dict[str, bool]] = None

class ReportResponse(BaseModel):
    id: UUID4
    dataset_id: UUID4
    name: str
    format: str
    file_path: str
    report_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
