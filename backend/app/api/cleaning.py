import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.services.cleaning import CleaningService
from app.schemas.dataset import DataCleaningRequest, DataCleaningResponse

router = APIRouter(prefix="/cleaning", tags=["Data Cleaning"])

@router.post("/{dataset_id}", response_model=DataCleaningResponse)
async def clean_dataset(
    dataset_id: uuid.UUID,
    req: DataCleaningRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers manual or automatic data cleaning on a dataset, saving a new cleaned copy."""
    dataset_dict = await db.datasets.find_one({"id": str(dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found."
        )
        
    dataset = Dataset(**dataset_dict)
    
    try:
        # Trigger operations
        result = CleaningService.clean_dataset(
            file_path=dataset.file_path,
            auto_clean=req.auto_clean,
            operations=req.operations
        )
        
        # Update dataset details in MongoDB
        await db.datasets.update_one(
            {"id": str(dataset_id)},
            {"$set": {
                "cleaned_file_path": result["cleaned_file_path"],
                "row_count": result["row_count"],
                "col_count": result["col_count"]
            }}
        )
        
        # Get fresh dataset
        updated_dict = await db.datasets.find_one({"id": str(dataset_id)})
        updated_dataset = Dataset(**updated_dict)
        
        return {
            "message": "Dataset cleaned successfully.",
            "dataset": updated_dataset,
            "stats_before": result["stats_before"],
            "stats_after": result["stats_after"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to clean dataset: {e}"
        )
