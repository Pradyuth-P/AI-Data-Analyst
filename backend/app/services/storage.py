import os
import shutil
from typing import BinaryIO
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        self.local_dir = settings.STORAGE_DIR
        
        if self.storage_type == "s3":
            try:
                import boto3
                self.s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                )
                self.bucket_name = settings.S3_BUCKET_NAME
            except ImportError:
                print("boto3 package not installed. Defaulting to local storage.")
                self.storage_type = "local"
            except Exception as e:
                print(f"Failed to initialize S3 client: {e}. Defaulting to local storage.")
                self.storage_type = "local"

    def save_file(self, file_obj: BinaryIO, filename: str, subfolder: str = "raw") -> str:
        """Saves a file and returns its identifier/path."""
        folder_path = os.path.join(self.local_dir, subfolder)
        os.makedirs(folder_path, exist_ok=True)
        local_path = os.path.join(folder_path, filename)
        
        # Save to local file system first
        with open(local_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
            
        if self.storage_type == "s3":
            try:
                s3_key = f"{subfolder}/{filename}"
                self.s3_client.upload_file(local_path, self.bucket_name, s3_key)
                # Return s3 URI or key
                return f"s3://{self.bucket_name}/{s3_key}"
            except Exception as e:
                print(f"Failed to upload to S3: {e}. Stored locally at {local_path}.")
                return local_path
                
        return local_path

    def get_file_path(self, path_or_uri: str) -> str:
        """Downloads from S3 if needed, or returns the local path directly."""
        if path_or_uri.startswith("s3://"):
            s3_key = path_or_uri.replace(f"s3://{self.bucket_name}/", "")
            local_path = os.path.join(self.local_dir, s3_key)
            if not os.path.exists(local_path):
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                self.s3_client.download_file(self.bucket_name, s3_key, local_path)
            return local_path
        return path_or_uri

    def delete_file(self, path_or_uri: str) -> bool:
        """Deletes file from S3 and/or local filesystem."""
        try:
            if path_or_uri.startswith("s3://"):
                s3_key = path_or_uri.replace(f"s3://{self.bucket_name}/", "")
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
                local_path = os.path.join(self.local_dir, s3_key)
                if os.path.exists(local_path):
                    os.remove(local_path)
            else:
                if os.path.exists(path_or_uri):
                    os.remove(path_or_uri)
            return True
        except Exception as e:
            print(f"Failed to delete file: {e}")
            return False

storage_service = StorageService()
