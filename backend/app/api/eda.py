import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.services.eda import EDAService

router = APIRouter(prefix="/eda", tags=["Automated EDA"])

@router.get("/{dataset_id}")
async def generate_eda(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers automated Exploratory Data Analysis (EDA) on an active dataset."""
    dataset_dict = await db.datasets.find_one({"id": str(dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found."
        )
        
    dataset = Dataset(**dataset_dict)
    
    try:
        # If cleaned version exists, analyze that. Otherwise fallback to raw.
        active_path = dataset.cleaned_file_path or dataset.file_path
        
        eda_results = EDAService.generate_eda(active_path)
        return eda_results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate exploratory analysis: {e}"
        )
