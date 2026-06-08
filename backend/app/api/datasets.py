import os
import uuid
import pandas as pd
import numpy as np
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.visualization import Visualization
from app.services.storage import storage_service
from app.services.cleaning import CleaningService
from app.schemas.dataset import DatasetResponse, JoinDatasetsRequest, JoinDatasetsResponse

router = APIRouter(prefix="/datasets", tags=["Datasets"])

MAX_FILE_SIZE = 50 * 1024 * 1024 

@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Handles dataset uploads (CSV, XLS, XLSX) and auto-generates chart recommendations."""
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload CSV or Excel files."
        )
        
    try:
        contents = await file.read()
        file_size = len(contents)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds the 50MB limit."
            )
            
        temp_filename = f"temp_{uuid.uuid4()}{ext}"
        os.makedirs("./storage/temp", exist_ok=True)
        temp_path = os.path.join("./storage/temp", temp_filename)
        
        with open(temp_path, "wb") as f:
            f.write(contents)
            
        if ext in [".xlsx", ".xls"]:
            df = pd.read_excel(temp_path)
        else:
            df = pd.read_csv(temp_path)
            
        row_count, col_count = df.shape
        if row_count == 0 or col_count == 0:
            raise ValueError("Uploaded file is empty.")
            
        null_counts = df.isnull().sum().to_dict()
        columns_meta = {}
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            columns_meta[col] = {
                "type": dtype_str,
                "null_count": int(null_counts[col]),
                "unique_count": int(df[col].nunique())
            }
            
        with open(temp_path, "rb") as f:
            saved_path = storage_service.save_file(f, filename, subfolder="raw")
            
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process and validate dataset: {e}"
        )
        
    db_dataset = Dataset(
        user_id=current_user.id,
        filename=filename,
        file_path=saved_path,
        file_size=file_size,
        row_count=row_count,
        col_count=col_count,
        columns_metadata=columns_meta
    )
    
    # Insert dataset document in MongoDB
    await db.datasets.insert_one(db_dataset.model_dump())
    
    # Auto recommendation builder
    await _generate_recommended_charts(db, db_dataset, df)
    
    return db_dataset

@router.get("", response_model=List[DatasetResponse])
async def get_datasets(
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all datasets belonging to the logged-in user."""
    cursor = db.datasets.find({"user_id": current_user.id}).sort("created_at", -1)
    datasets_dict = await cursor.to_list(length=100)
    return [DatasetResponse(**d) for d in datasets_dict]

@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves a specific dataset record."""
    dataset_dict = await db.datasets.find_one({"id": str(dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found."
        )
    return DatasetResponse(**dataset_dict)

@router.get("/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the first 50 rows of a dataset for previews."""
    dataset_dict = await db.datasets.find_one({"id": str(dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        
    dataset = Dataset(**dataset_dict)
    path = dataset.cleaned_file_path or dataset.file_path
    real_path = storage_service.get_file_path(path)
    
    try:
        if real_path.endswith((".xlsx", ".xls")):
            df = pd.read_excel(real_path)
        else:
            df = pd.read_csv(real_path)
        preview_data = df.head(50).replace({np.nan: None}).to_dict(orient="records")
        return {
            "columns": list(df.columns),
            "rows": preview_data
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to load preview: {e}")

@router.delete("/{dataset_id}", status_code=status.HTTP_200_OK)
async def delete_dataset(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Removes a dataset and its backing files."""
    dataset_dict = await db.datasets.find_one({"id": str(dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        
    dataset = Dataset(**dataset_dict)
    storage_service.delete_file(dataset.file_path)
    if dataset.cleaned_file_path:
        storage_service.delete_file(dataset.cleaned_file_path)
        
    await db.datasets.delete_one({"id": str(dataset_id)})
    await db.visualizations.delete_many({"dataset_id": str(dataset_id)})
    await db.chat_conversations.delete_many({"dataset_id": str(dataset_id)})
    return {"message": "Dataset deleted successfully."}

@router.post("/join", response_model=JoinDatasetsResponse)
async def join_datasets(
    req: JoinDatasetsRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Combines two datasets on matching fields to output a merged dataset."""
    dataset_a_dict = await db.datasets.find_one({"id": str(req.dataset_a_id), "user_id": current_user.id})
    dataset_b_dict = await db.datasets.find_one({"id": str(req.dataset_b_id), "user_id": current_user.id})
    
    if not dataset_a_dict or not dataset_b_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both datasets not found.")
        
    dataset_a = Dataset(**dataset_a_dict)
    dataset_b = Dataset(**dataset_b_dict)

    try:
        joined_path = CleaningService.join_datasets(
            dataset_a.file_path,
            dataset_b.file_path,
            req.join_type,
            req.join_on_a,
            req.join_on_b,
            req.output_filename
        )
        
        real_joined = storage_service.get_file_path(joined_path)
        df = pd.read_excel(real_joined) if real_joined.endswith((".xlsx", ".xls")) else pd.read_csv(real_joined)
        row_count, col_count = df.shape
        
        null_counts = df.isnull().sum().to_dict()
        columns_meta = {}
        for col in df.columns:
            columns_meta[col] = {
                "type": str(df[col].dtype),
                "null_count": int(null_counts[col]),
                "unique_count": int(df[col].nunique())
            }
            
        db_dataset = Dataset(
            user_id=current_user.id,
            filename=req.output_filename,
            file_path=joined_path,
            file_size=os.path.getsize(real_joined),
            row_count=row_count,
            col_count=col_count,
            columns_metadata=columns_meta
        )
        
        await db.datasets.insert_one(db_dataset.model_dump())
        await _generate_recommended_charts(db, db_dataset, df)
        
        return {
            "message": "Datasets joined successfully.",
            "dataset": db_dataset
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to join datasets: {e}"
        )

async def _generate_recommended_charts(db, dataset: Dataset, df: pd.DataFrame):
    """Helper that creates 3-4 recommended visualizations in the database automatically."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    
    recommendations = []

    # Recommendation 1: Bar chart
    if len(categorical_cols) > 0 and len(numeric_cols) > 0:
        cat = categorical_cols[0]
        num = numeric_cols[0]
        vis1 = Visualization(
            user_id=dataset.user_id,
            dataset_id=dataset.id,
            name=f"Sum of {num} by {cat}",
            chart_type="bar",
            configuration={
                "x_axis": cat,
                "y_axis": num,
                "agg": "sum",
                "title": f"Sum of {num} by {cat}"
            },
            is_dashboard_widget=True,
            grid_layout={"x": 0, "y": 0, "w": 6, "h": 4}
        )
        recommendations.append(vis1.model_dump())
        
    # Recommendation 2: Line chart
    date_cols = [c for c in df.columns if "date" in c.lower() or "time" in c.lower() or str(df[c].dtype).startswith("datetime")]
    if len(date_cols) > 0 and len(numeric_cols) > 0:
        dt = date_cols[0]
        num = numeric_cols[0]
        vis2 = Visualization(
            user_id=dataset.user_id,
            dataset_id=dataset.id,
            name=f"Average {num} Trend",
            chart_type="line",
            configuration={
                "x_axis": dt,
                "y_axis": num,
                "agg": "mean",
                "title": f"Average {num} Trend"
            },
            is_dashboard_widget=True,
            grid_layout={"x": 6, "y": 0, "w": 6, "h": 4}
        )
        recommendations.append(vis2.model_dump())
        
    # Recommendation 3: Pie chart
    if len(categorical_cols) > 0 and len(numeric_cols) > 0:
        cat = categorical_cols[0]
        num = numeric_cols[0]
        vis3 = Visualization(
            user_id=dataset.user_id,
            dataset_id=dataset.id,
            name=f"Contribution share of {cat}",
            chart_type="pie",
            configuration={
                "x_axis": cat,
                "y_axis": num,
                "agg": "sum",
                "title": f"Contribution share of {cat}"
            },
            is_dashboard_widget=True,
            grid_layout={"x": 0, "y": 4, "w": 6, "h": 4}
        )
        recommendations.append(vis3.model_dump())
        
    # Recommendation 4: Scatter chart
    if len(numeric_cols) > 1:
        num1 = numeric_cols[0]
        num2 = numeric_cols[1]
        vis4 = Visualization(
            user_id=dataset.user_id,
            dataset_id=dataset.id,
            name=f"Relationship: {num1} vs {num2}",
            chart_type="scatter",
            configuration={
                "x_axis": num1,
                "y_axis": num2,
                "title": f"Scatter Relationship: {num1} vs {num2}"
            },
            is_dashboard_widget=True,
            grid_layout={"x": 6, "y": 4, "w": 6, "h": 4}
        )
        recommendations.append(vis4.model_dump())
        
    if recommendations:
        try:
            await db.visualizations.insert_many(recommendations)
        except Exception as e:
            print(f"Failed to save default visualizations: {e}")
