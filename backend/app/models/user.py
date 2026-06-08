from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: str
    full_name: str | None = None
    role: str = "user"  # "user" or "admin"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
