import sys
import io
import os
import traceback
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from app.services.storage import storage_service

class SandboxService:
    @staticmethod
    def execute_query(dataset_path: str, code_str: str) -> Dict[str, Any]:
        """
        Executes python code against a dataset.
        Expects the code to interact with a DataFrame named 'df'.
        It captures printed stdout and extracts:
        - `result_text`: string (custom output answer)
        - `result_df`: pd.DataFrame (summary table output)
        - `result_chart`: plotly figure/JSON (charts)
        """
        # Resolve real path
        real_path = storage_service.get_file_path(dataset_path)
        
        # Load dataset
        try:
            if real_path.endswith((".xlsx", ".xls")):
                df = pd.read_excel(real_path)
            else:
                df = pd.read_csv(real_path)
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to load dataset: {str(e)}",
                "stdout": "",
                "result_text": None,
                "result_table": None,
                "result_chart": None
            }

        # Prepare sandbox execution environment
        stdout_redirect = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = stdout_redirect

        # Define globals/locals
        sandbox_globals = {
            "pd": pd,
            "np": np,
            "px": px,
            "go": go,
            "df": df,
            # Output containers
            "result_text": None,
            "result_df": None,
            "result_chart": None,
        }

        success = True
        error_msg = ""
        
        try:
            # Clean up markdown code wraps from LLM code block
            cleaned_code = SandboxService._clean_code(code_str)
            
            # Execute python code
            exec(cleaned_code, sandbox_globals)
        except Exception as e:
            success = False
            error_msg = f"{type(e).__name__}: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        finally:
            # Restore stdout
            sys.stdout = old_stdout
            captured_stdout = stdout_redirect.getvalue()

        # Extract results
        res_text = sandbox_globals.get("result_text")
        res_df = sandbox_globals.get("result_df")
        res_chart = sandbox_globals.get("result_chart")
        
        # Serialize result_df to records if it is a DataFrame
        result_table = None
        if isinstance(res_df, pd.DataFrame):
            # Cap table output size
            truncated_df = res_df.head(100)
            result_table = truncated_df.replace({np.nan: None}).to_dict(orient="records")
        elif isinstance(res_df, pd.Series):
            result_table = res_df.reset_index().replace({np.nan: None}).to_dict(orient="records")
            
        # Serialize Plotly chart to dictionary
        result_chart_dict = None
        if res_chart is not None:
            try:
                # If it's a Plotly figure, convert to JSON/dict
                if hasattr(res_chart, "to_dict"):
                    result_chart_dict = res_chart.to_dict()
                elif isinstance(res_chart, dict):
                    result_chart_dict = res_chart
            except Exception as chart_err:
                captured_stdout += f"\n[Warning] Failed to serialize plotly chart: {chart_err}"

        return {
            "success": success,
            "error": error_msg if not success else None,
            "stdout": captured_stdout,
            "result_text": str(res_text) if res_text is not None else (captured_stdout if captured_stdout else None),
            "result_table": result_table,
            "result_chart": result_chart_dict
        }

    @staticmethod
    def _clean_code(code_str: str) -> str:
        """Strips markdown python code markers if present."""
        cleaned = code_str.strip()
        if cleaned.startswith("```python"):
            cleaned = cleaned[9:]
        elif cleaned.startswith("```py"):
            cleaned = cleaned[5:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
            
        return cleaned.strip()
