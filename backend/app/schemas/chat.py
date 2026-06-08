from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, UUID4

class ChatMessageBase(BaseModel):
    role: str
    content: str
    chart_data: Optional[Dict[str, Any]] = None
    table_data: Optional[List[Dict[str, Any]]] = None

class ChatMessageCreate(BaseModel):
    content: str
    ai_provider: Optional[str] = None  # Allow switching per chat

class ChatMessageResponse(ChatMessageBase):
    id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True

class ChatConversationCreate(BaseModel):
    dataset_id: UUID4
    title: str

class ChatConversationResponse(BaseModel):
    id: UUID4
    dataset_id: UUID4
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConversationDetailResponse(ChatConversationResponse):
    messages: List[ChatMessageResponse] = []
