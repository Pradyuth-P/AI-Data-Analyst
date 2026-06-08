from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, UUID4

class VisualizationBase(BaseModel):
    name: str
    chart_type: str
    configuration: Dict[str, Any]
    is_dashboard_widget: Optional[bool] = False
    grid_layout: Optional[Dict[str, Any]] = None

class VisualizationCreate(VisualizationBase):
    dataset_id: UUID4

class VisualizationUpdate(BaseModel):
    name: Optional[str] = None
    chart_type: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    is_dashboard_widget: Optional[bool] = None
    grid_layout: Optional[Dict[str, Any]] = None

class VisualizationResponse(VisualizationBase):
    id: UUID4
    dataset_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True

class WidgetLayoutItem(BaseModel):
    id: UUID4
    grid_layout: Dict[str, Any]

class UpdateDashboardLayoutRequest(BaseModel):
    widgets: List[WidgetLayoutItem]
