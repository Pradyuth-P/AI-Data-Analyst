import os
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.ensemble import IsolationForest
from app.services.storage import storage_service

class AnomalyService:
    @classmethod
    def detect_anomalies(
        self, 
        file_path: str, 
        columns: List[str], 
        algorithm: str = "zscore", 
        threshold: float = 3.0
    ) -> Dict[str, Any]:
        """Detects outliers/anomalies in specified columns using Z-Score, IQR, or Isolation Forest."""
        real_path = storage_service.get_file_path(file_path)
        
        # Load dataset
        is_excel = real_path.endswith((".xlsx", ".xls"))
        if is_excel:
            df = pd.read_excel(real_path)
        else:
            df = pd.read_csv(real_path)
            
        # Filter for numeric columns
        valid_cols = [c for c in columns if c in df.columns and np.issubdtype(df[c].dtype, np.number)]
        if not valid_cols:
            return {
                "success": False,
                "error": "No valid numeric columns selected for anomaly detection.",
                "anomalies": [],
                "summary": {}
            }
            
        anomalies_list = []
        
        if algorithm == "zscore":
            for col in valid_cols:
                col_mean = df[col].mean()
                col_std = df[col].std()
                if col_std == 0:
                    continue
                
                # Z-scores
                z_scores = (df[col] - col_mean) / col_std
                outliers_mask = z_scores.abs() > threshold
                outlier_indices = df[outliers_mask].index
                
                for idx in outlier_indices:
                    val = df.loc[idx, col]
                    z_val = z_scores.loc[idx]
                    
                    # Severity based on magnitude of Z
                    abs_z = abs(z_val)
                    severity = "low"
                    if abs_z > 4.5:
                        severity = "high"
                    elif abs_z > 3.5:
                        severity = "medium"
                        
                    confidence = min(0.99, abs_z / 6.0)
                    
                    anomalies_list.append({
                        "row_index": int(idx),
                        "column": col,
                        "value": float(val),
                        "z_score": float(z_val),
                        "severity": severity,
                        "confidence": float(confidence),
                        "algorithm": "Z-Score",
                        "impact": f"Value '{val}' lies {abs_z:.2f} standard deviations away from average.",
                        "suggested_action": f"Verify if '{val}' was caused by data input errors or representing genuine business spikes. Consider capping or imputing."
                    })
                    
        elif algorithm == "iqr":
            for col in valid_cols:
                q1 = df[col].quantile(0.25)
                q3 = df[col].quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - (1.5 * iqr)
                upper_bound = q3 + (1.5 * iqr)
                
                outliers_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
                outlier_indices = df[outliers_mask].index
                
                for idx in outlier_indices:
                    val = df.loc[idx, col]
                    
                    # Calculate deviation from bounds
                    dev = 0
                    if val < lower_bound:
                        dev = abs(lower_bound - val) / (iqr if iqr > 0 else 1)
                    else:
                        dev = abs(val - upper_bound) / (iqr if iqr > 0 else 1)
                        
                    severity = "low"
                    if dev > 2.0:
                        severity = "high"
                    elif dev > 1.0:
                        severity = "medium"
                        
                    confidence = min(0.95, 0.5 + dev/4.0)
                    
                    anomalies_list.append({
                        "row_index": int(idx),
                        "column": col,
                        "value": float(val),
                        "severity": severity,
                        "confidence": float(confidence),
                        "algorithm": "IQR",
                        "impact": f"Value is outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR] by {dev:.2f} IQR bounds.",
                        "suggested_action": "Exclude from high-sensitivity predictive modeling to prevent skewing distributions."
                    })
                    
        elif algorithm == "isolation_forest":
            # Multi-dimensional anomaly detection
            model_df = df[valid_cols].fillna(df[valid_cols].median())
            
            # Init model
            clf = IsolationForest(contamination=0.02, random_state=42)
            clf.fit(model_df)
            
            preds = clf.predict(model_df)  # 1 normal, -1 anomaly
            scores = clf.decision_function(model_df)  # Lower is more anomalous
            
            outlier_indices = np.where(preds == -1)[0]
            
            for idx in outlier_indices:
                score = float(scores[idx])
                # Normalize confidence
                confidence = float(min(0.99, abs(score) * 4.0))
                
                severity = "low"
                if score < -0.15:
                    severity = "high"
                elif score < -0.05:
                    severity = "medium"
                    
                # Store representation
                anomalies_list.append({
                    "row_index": int(idx),
                    "columns_analyzed": valid_cols,
                    "score": score,
                    "severity": severity,
                    "confidence": confidence,
                    "algorithm": "Isolation Forest",
                    "impact": "Multi-dimensional anomaly. Row variables reflect anomalous clustering behaviors.",
                    "suggested_action": "Conduct deep dive review of this specific row, it displays an overall unusual profile across variables."
                })

        # Cap length to 200 items to avoid overwhelming network transfers
        truncated_list = anomalies_list[:200]
        
        # Build summary stats
        summary = {
            "total_detected": len(anomalies_list),
            "high_severity_count": sum(1 for a in anomalies_list if a["severity"] == "high"),
            "medium_severity_count": sum(1 for a in anomalies_list if a["severity"] == "medium"),
            "low_severity_count": sum(1 for a in anomalies_list if a["severity"] == "low"),
            "percentage_of_data": float((len(anomalies_list) / len(df)) * 100) if len(df) > 0 else 0
        }

        return {
            "success": True,
            "anomalies": truncated_list,
            "summary": summary
        }
