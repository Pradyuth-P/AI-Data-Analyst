import uuid
import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.report import Report
from app.services.eda import EDAService
from app.services.anomalies import AnomalyService
from app.services.reporting import ReportingService
from app.schemas.report import ReportRequest, ReportResponse

router = APIRouter(prefix="/reports", tags=["Reports Module"])

@router.post("", response_model=ReportResponse)
async def generate_report(
    req: ReportRequest,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers generation of PDF or Word reports complete with statistical EDA tables and AI comments."""
    dataset_dict = await db.datasets.find_one({"id": str(req.dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        
    dataset = Dataset(**dataset_dict)
    
    try:
        active_path = dataset.cleaned_file_path or dataset.file_path
        
        # 1. Fetch EDA details
        eda_data = EDAService.generate_eda(active_path)
        
        # 2. Fetch Anomaly details
        df_cols = list(dataset.columns_metadata.keys())
        numeric_cols = [c for c in df_cols if dataset.columns_metadata[c]["type"] in ["int64", "float64", "int32", "float32"]]
        
        anom_data = None
        if numeric_cols:
            anom_data = AnomalyService.detect_anomalies(
                file_path=active_path,
                columns=numeric_cols[:3],
                algorithm="zscore"
            )
            
        # 3. Create file details
        reports_dir = "./storage/reports"
        os.makedirs(reports_dir, exist_ok=True)
        
        ext = "pdf" if req.format.lower() == "pdf" else "docx"
        output_filename = f"report_{uuid.uuid4()}.{ext}"
        output_path = os.path.join(reports_dir, output_filename)
        
        ai_insights = eda_data.get("executive_summary", "")
        
        # 4. Generate report
        if ext == "pdf":
            ReportingService.generate_pdf_report(
                output_path=output_path,
                report_name=req.name,
                dataset_name=dataset.filename,
                eda_data=eda_data,
                anomalies_data=anom_data,
                ai_insights=ai_insights
            )
        else:
            ReportingService.generate_word_report(
                output_path=output_path,
                report_name=req.name,
                dataset_name=dataset.filename,
                eda_data=eda_data,
                anomalies_data=anom_data,
                ai_insights=ai_insights
            )
            
        # Log to MongoDB
        db_report = Report(
            user_id=current_user.id,
            dataset_id=str(req.dataset_id),
            name=req.name,
            format=req.format,
            file_path=output_path,
            report_metadata={
                "total_rows": dataset.row_count,
                "total_cols": dataset.col_count,
                "executive_summary": ai_insights[:500] if ai_insights else ""
            }
        )
        
        await db.reports.insert_one(db_report.model_dump())
        
        return db_report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate document report: {e}"
        )

@router.get("", response_model=List[ReportResponse])
async def list_reports(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists generated report downloads for a dataset."""
    cursor = db.reports.find({
        "dataset_id": str(dataset_id),
        "user_id": current_user.id
    }).sort("created_at", -1)
    
    rep_dicts = await cursor.to_list(length=100)
    return [ReportResponse(**r) for r in rep_dicts]

@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Serves raw generated report documents for client download."""
    report_dict = await db.reports.find_one({"id": str(report_id), "user_id": current_user.id})
    if not report_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report document not found.")
        
    report = Report(**report_dict)
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found on disk.")
        
    media_type = "application/pdf" if report.format.lower() == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    return FileResponse(
        path=report.file_path,
        media_type=media_type,
        filename=f"{report.name.replace(' ', '_')}.{report.format.lower()}"
    )
