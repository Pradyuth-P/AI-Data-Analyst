import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.forecast import Forecast
from app.services.forecasting import ForecastingService
from app.schemas.forecast import ForecastRequest, ForecastResponse

router = APIRouter(prefix="/forecast", tags=["Forecasting Engine"])

@router.post("", response_model=ForecastResponse)
async def trigger_forecast(
    req: ForecastRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers time-series forecasting (ARIMA / Linear Regression fallback) on a dataset."""
    dataset_dict = await db.datasets.find_one({"id": str(req.dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        
    dataset = Dataset(**dataset_dict)
    
    try:
        active_path = dataset.cleaned_file_path or dataset.file_path
        
        forecast_results = ForecastingService.generate_forecast(
            file_path=active_path,
            date_column=req.date_column,
            target_column=req.target_column,
            periods=req.forecast_period
        )
        
        if not forecast_results.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=forecast_results.get("error", "Forecasting failed.")
            )
            
        # Log Forecast into MongoDB
        db_forecast = Forecast(
            user_id=current_user.id,
            dataset_id=str(req.dataset_id),
            target_column=req.target_column,
            date_column=req.date_column,
            forecast_period=req.forecast_period,
            forecast_results=forecast_results
        )
        await db.forecasts.insert_one(db_forecast.model_dump())
        
        return db_forecast
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting engine encountered an error: {e}"
        )
