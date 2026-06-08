import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.services.storage import storage_service
from app.schemas.dataset import CleanOperation

class CleaningService:
    @staticmethod
    def get_quality_stats(df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates null counts, duplicates, shapes, and datatype categories."""
        null_counts = df.isnull().sum().to_dict()
        data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        # Outlier counts (numeric columns only)
        outlier_counts = {}
        for col in df.select_dtypes(include=[np.number]).columns:
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outliers = df[(df[col] < lower) | (df[col] > upper)]
            outlier_counts[col] = int(len(outliers))

        return {
            "row_count": len(df),
            "column_count": len(df.columns),
            "duplicate_count": int(df.duplicated().sum()),
            "null_counts": {col: int(val) for col, val in null_counts.items()},
            "data_types": data_types,
            "outlier_counts": outlier_counts
        }

    @classmethod
    def clean_dataset(
        self, 
        file_path: str, 
        auto_clean: bool = False, 
        operations: Optional[List[CleanOperation]] = None
    ) -> Dict[str, Any]:
        """Applies cleaning strategies and saves the cleaned dataset file."""
        real_path = storage_service.get_file_path(file_path)
        
        # Load dataset
        is_excel = real_path.endswith((".xlsx", ".xls"))
        if is_excel:
            df = pd.read_excel(real_path)
        else:
            df = pd.read_csv(real_path)
            
        stats_before = self.get_quality_stats(df)
        
        # Perform Auto Clean
        if auto_clean:
            # 1. Remove duplicate rows
            df = df.drop_duplicates()
            
            # 2. Trim whitespace in text columns
            for col in df.select_dtypes(include=["object"]).columns:
                try:
                    df[col] = df[col].str.strip()
                except:
                    pass
            
            # 3. Simple auto imputation
            for col in df.columns:
                null_count = df[col].isnull().sum()
                if null_count > 0:
                    # If high missingness (> 60%), drop the column
                    if null_count / len(df) > 0.6:
                        df = df.drop(columns=[col])
                    else:
                        # Numeric columns -> Fill with median
                        if np.issubdtype(df[col].dtype, np.number):
                            df[col] = df[col].fillna(df[col].median())
                        # Categorical/Other -> Fill with mode or 'Unknown'
                        else:
                            mode_val = df[col].mode()
                            if not mode_val.empty:
                                df[col] = df[col].fillna(mode_val[0])
                            else:
                                df[col] = df[col].fillna("Unknown")
        
        # Perform Manual operations
        if operations:
            for op in operations:
                col = op.column
                if col not in df.columns:
                    continue
                
                strategy = op.strategy
                
                if strategy == "fill_mean":
                    if np.issubdtype(df[col].dtype, np.number):
                        df[col] = df[col].fillna(df[col].mean())
                elif strategy == "fill_median":
                    if np.issubdtype(df[col].dtype, np.number):
                        df[col] = df[col].fillna(df[col].median())
                elif strategy == "fill_mode":
                    mode_val = df[col].mode()
                    if not mode_val.empty:
                        df[col] = df[col].fillna(mode_val[0])
                elif strategy == "fill_value":
                    df[col] = df[col].fillna(op.fill_value)
                elif strategy == "drop_na":
                    df = df.dropna(subset=[col])
                elif strategy == "remove_outliers":
                    if np.issubdtype(df[col].dtype, np.number):
                        q1 = df[col].quantile(0.25)
                        q3 = df[col].quantile(0.75)
                        iqr = q3 - q1
                        lower = q1 - 1.5 * iqr
                        upper = q3 + 1.5 * iqr
                        df = df[(df[col] >= lower) & (df[col] <= upper)]
                elif strategy == "type_convert":
                    target = op.target_type
                    try:
                        if target == "int":
                            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
                        elif target == "float":
                            df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)
                        elif target == "str":
                            df[col] = df[col].astype(str)
                        elif target == "datetime":
                            df[col] = pd.to_datetime(df[col], errors="coerce")
                    except Exception as e:
                        print(f"Failed casting type for column {col}: {e}")

        # Remove general duplicates if we ran manual cleans (optional step to keep data clean)
        df = df.reset_index(drop=True)
        stats_after = self.get_quality_stats(df)
        
        # Save output
        filename = os.path.basename(real_path)
        name, ext = os.path.splitext(filename)
        cleaned_filename = f"{name}_cleaned{ext}"
        
        # Save to storage
        temp_dir = "./storage/temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, cleaned_filename)
        
        if is_excel:
            df.to_excel(temp_path, index=False)
        else:
            df.to_csv(temp_path, index=False)
            
        with open(temp_path, "rb") as f:
            cleaned_file_path = storage_service.save_file(f, cleaned_filename, subfolder="cleaned")
            
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return {
            "cleaned_file_path": cleaned_file_path,
            "row_count": len(df),
            "col_count": len(df.columns),
            "stats_before": stats_before,
            "stats_after": stats_after
        }

    @classmethod
    def join_datasets(
        self, 
        path_a: str, 
        path_b: str, 
        join_type: str, 
        join_on_a: str, 
        join_on_b: str, 
        output_filename: str
    ) -> str:
        """Joins two datasets on specified keys and saves the output."""
        real_path_a = storage_service.get_file_path(path_a)
        real_path_b = storage_service.get_file_path(path_b)
        
        df_a = pd.read_excel(real_path_a) if real_path_a.endswith((".xlsx", ".xls")) else pd.read_csv(real_path_a)
        df_b = pd.read_excel(real_path_b) if real_path_b.endswith((".xlsx", ".xls")) else pd.read_csv(real_path_b)
        
        # Align column names for join
        df_joined = pd.merge(
            df_a, 
            df_b, 
            left_on=join_on_a, 
            right_on=join_on_b, 
            how=join_type, 
            suffixes=("_a", "_b")
        )
        
        # Save output
        temp_dir = "./storage/temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, output_filename)
        
        if output_filename.endswith((".xlsx", ".xls")):
            df_joined.to_excel(temp_path, index=False)
        else:
            df_joined.to_csv(temp_path, index=False)
            
        with open(temp_path, "rb") as f:
            joined_file_path = storage_service.save_file(f, output_filename, subfolder="raw")
            
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return joined_file_path
