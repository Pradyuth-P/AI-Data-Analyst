import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.services.storage import storage_service
from app.services.ai import ai_service

class EDAService:
    @classmethod
    def generate_eda(self, file_path: str) -> Dict[str, Any]:
        """Runs comprehensive EDA on a dataset and returns tabular/graphical summaries."""
        real_path = storage_service.get_file_path(file_path)
        
        # Load dataset
        is_excel = real_path.endswith((".xlsx", ".xls"))
        if is_excel:
            df = pd.read_excel(real_path)
        else:
            df = pd.read_csv(real_path)
            
        row_count, col_count = df.shape
        
        # Overview
        overview = {
            "row_count": row_count,
            "col_count": col_count,
            "duplicate_count": int(df.duplicated().sum()),
            "missing_count": int(df.isnull().sum().sum()),
            "missing_percentage": float((df.isnull().sum().sum() / df.size) * 100) if df.size > 0 else 0
        }
        
        # Column descriptions
        columns_summary = []
        for col in df.columns:
            nulls = int(df[col].isnull().sum())
            uniques = int(df[col].nunique())
            col_type = str(df[col].dtype)
            
            col_stats = {
                "name": col,
                "type": col_type,
                "null_count": nulls,
                "null_percentage": float((nulls / row_count) * 100) if row_count > 0 else 0,
                "unique_count": uniques,
            }
            
            # Numeric column stats
            if pd.api.types.is_numeric_dtype(df[col]):
                desc = df[col].describe()
                col_stats.update({
                    "mean": float(desc.get("mean", 0)) if not pd.isna(desc.get("mean")) else None,
                    "std": float(desc.get("std", 0)) if not pd.isna(desc.get("std")) else None,
                    "min": float(desc.get("min", 0)) if not pd.isna(desc.get("min")) else None,
                    "max": float(desc.get("max", 0)) if not pd.isna(desc.get("max")) else None,
                    "q25": float(desc.get("25%", 0)) if not pd.isna(desc.get("25%")) else None,
                    "q50": float(desc.get("50%", 0)) if not pd.isna(desc.get("50%")) else None,
                    "q75": float(desc.get("75%", 0)) if not pd.isna(desc.get("75%")) else None,
                })
            else:
                # Text/Categorical stats
                mode_series = df[col].mode()
                col_stats.update({
                    "mode": str(mode_series[0]) if not mode_series.empty else None,
                    "top_values": {str(k): int(v) for k, v in df[col].value_counts().head(5).items()}
                })
                
            columns_summary.append(col_stats)
            
        # Correlation Matrix
        numeric_df = df.select_dtypes(include=[np.number])
        correlation_matrix = {}
        if len(numeric_df.columns) > 1:
            corr = numeric_df.corr().replace({np.nan: 0})
            correlation_matrix = {
                "columns": list(corr.columns),
                "values": corr.values.tolist()
            }
            
        # Categorical summaries
        categorical_summaries = {}
        categorical_cols = df.select_dtypes(include=["object", "category"]).columns[:5]  # Limit to top 5
        for col in categorical_cols:
            categorical_summaries[col] = {str(k): int(v) for k, v in df[col].value_counts().head(10).items()}
            
        # Generate executive summary using AI
        exec_summary = self._generate_ai_summary(overview, columns_summary, correlation_matrix)
        
        return {
            "overview": overview,
            "columns": columns_summary,
            "correlation": correlation_matrix,
            "categorical": categorical_summaries,
            "executive_summary": exec_summary
        }

    @classmethod
    def _generate_ai_summary(
        self, 
        overview: Dict[str, Any], 
        columns: List[Dict[str, Any]], 
        correlation: Dict[str, Any]
    ) -> str:
        cols_text = []
        for c in columns[:15]:  # Send first 15 columns metadata to save token limits
            info = f"- {c['name']} (Type: {c['type']}, Nulls: {c['null_percentage']:.1f}%, Uniques: {c['unique_count']})"
            if "mean" in c and c["mean"] is not None:
                info += f" | Mean: {c['mean']:.2f}, Range: [{c['min']:.2f} - {c['max']:.2f}]"
            cols_text.append(info)
            
        cols_text_str = "\n".join(cols_text)
            
        prompt = f"""
        You are an elite Business Intelligence Analyst. Prepare a premium executive summary of this dataset:
        
        DATASET OVERVIEW:
        - Row Count: {overview['row_count']}
        - Column Count: {overview['col_count']}
        - Duplicates: {overview['duplicate_count']}
        - Total Nulls: {overview['missing_count']} ({overview['missing_percentage']:.1f}%)
        
        COLUMN SNAPSHOTS:
        {cols_text_str}
        
        Provide:
        1. **Executive Snapshot**: A high-level 2-3 sentence summary of the dataset's nature.
        2. **Key Strengths / Assets**: Interesting statistical observations or data volumes.
        3. **Data Quality Concerns**: Warnings regarding nulls, duplicates, or weird data scopes.
        4. **Key Recommendations for Analysis**: 3 recommended questions or angles of exploration.
        
        Style guidelines: Use markdown headers, bullet points, clean wording, and a professional tone (linear/notion style).
        """
        try:
            return ai_service.generate_completion(prompt)
        except Exception as e:
            return f"Failed to generate AI executive summary: {e}"
