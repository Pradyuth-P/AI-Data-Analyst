import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.deps import get_current_active_admin
from app.models.user import User
from app.models.dataset import Dataset
from app.models.report import Report
from app.models.log import SystemLog
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin Operations Dashboard"])

@router.get("/users", response_model=List[UserResponse])
async def get_users_list(
    db = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Retrieves all registered users (Admin only)."""
    users_cursor = db.users.find().sort("created_at", -1)
    users_list = await users_cursor.to_list(length=1000)
    return [UserResponse(**u) for u in users_list]

@router.put("/users/{user_id}/status", response_model=UserResponse)
async def toggle_user_active_status(
    user_id: uuid.UUID,
    is_active: bool,
    db = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Toggles active/inactive state of a user account (Admin only)."""
    user_id_str = str(user_id)
    user_dict = await db.users.find_one({"id": user_id_str})
    if not user_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        
    await db.users.update_one({"id": user_id_str}, {"$set": {"is_active": is_active}})
    
    updated_user_dict = await db.users.find_one({"id": user_id_str})
    return UserResponse(**updated_user_dict)

@router.get("/stats")
async def get_system_stats(
    db = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Returns platform-wide metrics (Admin only)."""
    total_users = await db.users.count_documents({})
    total_datasets = await db.datasets.count_documents({})
    total_reports = await db.reports.count_documents({})
    
    # Storage footprint sum via MongoDB aggregation
    pipeline = [{"$group": {"_id": None, "total_size": {"$sum": "$file_size"}}}]
    cursor = db.datasets.aggregate(pipeline)
    result = await cursor.to_list(length=1)
    total_storage_bytes = result[0]["total_size"] if result else 0
    
    # Recent logs counts
    error_logs_count = await db.system_logs.count_documents({"level": {"$in": ["ERROR", "CRITICAL"]}})
    
    return {
        "metrics": {
            "total_users": total_users,
            "total_datasets": total_datasets,
            "total_reports": total_reports,
            "storage_footprint_mb": round(total_storage_bytes / (1024 * 1024), 2),
            "critical_system_errors": error_logs_count
        }
    }

@router.get("/logs", response_model=List[SystemLog])
async def get_system_logs(
    limit: int = 50,
    db = Depends(get_db),
    admin_user: User = Depends(get_current_active_admin)
):
    """Returns recent system logs for monitoring (Admin only)."""
    logs_cursor = db.system_logs.find().sort("created_at", -1).limit(limit)
    logs_list = await logs_cursor.to_list(length=limit)
    return [SystemLog(**log) for log in logs_list]

