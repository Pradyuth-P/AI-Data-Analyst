import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.visualization import Visualization
from app.schemas.visualization import (
    VisualizationCreate,
    VisualizationResponse,
    VisualizationUpdate,
    UpdateDashboardLayoutRequest
)

router = APIRouter(prefix="/visualizations", tags=["Visualizations & Dashboard"])

@router.post("", response_model=VisualizationResponse, status_code=status.HTTP_201_CREATED)
async def create_visualization(
    vis_in: VisualizationCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves a custom visualization widget associated with a dataset."""
    dataset_dict = await db.datasets.find_one({"id": str(vis_in.dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        
    db_vis = Visualization(
        user_id=current_user.id,
        dataset_id=str(vis_in.dataset_id),
        name=vis_in.name,
        chart_type=vis_in.chart_type,
        configuration=vis_in.configuration,
        is_dashboard_widget=vis_in.is_dashboard_widget,
        grid_layout=vis_in.grid_layout or {"x": 0, "y": 0, "w": 6, "h": 4}
    )
    await db.visualizations.insert_one(db_vis.model_dump())
    return db_vis

@router.get("", response_model=List[VisualizationResponse])
async def list_visualizations(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all saved charts/dashboard widgets for a dataset."""
    cursor = db.visualizations.find({
        "dataset_id": str(dataset_id),
        "user_id": current_user.id
    })
    vis_dicts = await cursor.to_list(length=100)
    return [VisualizationResponse(**v) for v in vis_dicts]

@router.put("/{vis_id}", response_model=VisualizationResponse)
async def update_visualization(
    vis_id: uuid.UUID,
    vis_in: VisualizationUpdate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates a single visualization configurations or settings."""
    vis_dict = await db.visualizations.find_one({"id": str(vis_id), "user_id": current_user.id})
    if not vis_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visualization not found.")
        
    update_data = vis_in.model_dump(exclude_unset=True)
    if update_data:
        await db.visualizations.update_one(
            {"id": str(vis_id), "user_id": current_user.id},
            {"$set": update_data}
        )
        
    # Get updated
    fresh_vis = await db.visualizations.find_one({"id": str(vis_id)})
    return VisualizationResponse(**fresh_vis)

@router.put("/dashboard/layout", status_code=status.HTTP_200_OK)
async def update_dashboard_layout(
    req: UpdateDashboardLayoutRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Batch updates coordinates of dashboard widgets."""
    for item in req.widgets:
        await db.visualizations.update_one(
            {"id": str(item.id), "user_id": current_user.id},
            {"$set": {"grid_layout": item.grid_layout}}
        )
    return {"message": "Layout updated successfully."}

@router.delete("/{vis_id}", status_code=status.HTTP_200_OK)
async def delete_visualization(
    vis_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a saved visualization."""
    vis_dict = await db.visualizations.find_one({"id": str(vis_id), "user_id": current_user.id})
    if not vis_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visualization not found.")
        
    await db.visualizations.delete_one({"id": str(vis_id), "user_id": current_user.id})
    return {"message": "Visualization deleted successfully."}
