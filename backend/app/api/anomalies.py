import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.services.anomalies import AnomalyService

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection"])

@router.get("/{dataset_id}")
async def detect_anomalies(
    dataset_id: uuid.UUID,
    columns: str,  # Comma separated column list
    algorithm: Optional[str] = "zscore",
    threshold: Optional[float] = 3.0,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detects statistical outliers or cluster anomalies in the dataset's numerical variables."""
    dataset_dict = await db.datasets.find_one({"id": str(dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found."
        )
        
    dataset = Dataset(**dataset_dict)
    
    try:
        active_path = dataset.cleaned_file_path or dataset.file_path
        cols_list = [c.strip() for c in columns.split(",") if c.strip()]
        
        results = AnomalyService.detect_anomalies(
            file_path=active_path,
            columns=cols_list,
            algorithm=algorithm,
            threshold=threshold
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Outlier computation failed: {e}"
        )
