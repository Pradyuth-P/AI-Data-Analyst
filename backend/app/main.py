from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import get_db

# Import routers
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router
from app.api.cleaning import router as cleaning_router
from app.api.eda import router as eda_router
from app.api.chat import router as chat_router
from app.api.visualizations import router as visualizations_router
from app.api.forecast import router as forecast_router
from app.api.anomalies import router as anomalies_router
from app.api.reports import router as reports_router
from app.api.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Data Clean, EDA, Chat, Forecast, and Reporting SaaS platform.",
    version="1.0.0"
)

# Enable CORS for React Frontend local dev & production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://192.168.1.2:5173",
        "http://192.168.1.2:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup handler to verify database connectivity
@app.on_event("startup")
async def startup_event():
    try:
        from app.core.database import db
        await db.command("ping")
        print("Database connection verified successfully.")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

# Router Registrations
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(cleaning_router, prefix=settings.API_V1_STR)
app.include_router(eda_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(visualizations_router, prefix=settings.API_V1_STR)
app.include_router(forecast_router, prefix=settings.API_V1_STR)
app.include_router(anomalies_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

# Health Check Route
@app.get("/health", tags=["Health Monitor"])
async def health_check(db = Depends(get_db)):
    """Simple check confirming backend status and database connections."""
    try:
        # Simple query to verify DB connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "api_name": settings.PROJECT_NAME
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection degraded: {e}"
        )
