from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, UUID4

class DatasetResponse(BaseModel):
    id: UUID4
    filename: str
    file_size: int
    row_count: int
    col_count: int
    columns_metadata: Dict[str, Any]
    cleaned_file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CleanOperation(BaseModel):
    column: str
    strategy: str  # "fill_mean", "fill_median", "fill_mode", "fill_value", "drop_na", "type_convert", "remove_outliers"
    fill_value: Optional[str] = None
    target_type: Optional[str] = None  # "int", "float", "str", "datetime"

class DataCleaningRequest(BaseModel):
    auto_clean: bool = False
    operations: Optional[List[CleanOperation]] = None

class DataCleaningResponse(BaseModel):
    message: str
    dataset: DatasetResponse
    stats_before: Dict[str, Any]
    stats_after: Dict[str, Any]

class JoinDatasetsRequest(BaseModel):
    dataset_a_id: UUID4
    dataset_b_id: UUID4
    join_type: str  # "inner", "left", "right", "outer"
    join_on_a: str  # Key column in dataset A
    join_on_b: str  # Key column in dataset B
    output_filename: str

class JoinDatasetsResponse(BaseModel):
    message: str
    dataset: DatasetResponse
