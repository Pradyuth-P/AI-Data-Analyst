from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

class ChatConversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    dataset_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # "user" or "assistant"
    content: str
    chart_data: Optional[Dict[str, Any]] = None
    table_data: Optional[List[Dict[str, Any]]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
