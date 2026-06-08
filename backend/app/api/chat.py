import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatConversation, ChatMessage
from app.models.dataset import Dataset
from app.services.ai import ai_service
from app.services.sandbox import SandboxService
from app.schemas.chat import (
    ChatConversationResponse,
    ChatConversationCreate,
    ChatMessageResponse,
    ChatMessageCreate,
    ConversationDetailResponse
)

router = APIRouter(prefix="/chat", tags=["AI Chat Assistant"])

@router.post("/conversations", response_model=ChatConversationResponse)
async def create_conversation(
    req: ChatConversationCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new conversation thread bound to a specific dataset."""
    dataset_dict = await db.datasets.find_one({"id": str(req.dataset_id), "user_id": current_user.id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
        
    db_conv = ChatConversation(
        user_id=current_user.id,
        dataset_id=str(req.dataset_id),
        title=req.title
    )
    await db.chat_conversations.insert_one(db_conv.model_dump())
    return db_conv

@router.get("/conversations", response_model=List[ChatConversationResponse])
async def list_conversations(
    dataset_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists conversations associated with the dataset."""
    cursor = db.chat_conversations.find({
        "user_id": current_user.id,
        "dataset_id": str(dataset_id)
    }).sort("updated_at", -1)
    
    convs_dict = await cursor.to_list(length=100)
    return [ChatConversationResponse(**c) for c in convs_dict]

@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_details(
    conversation_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches a conversation thread along with its complete message history."""
    conv_dict = await db.chat_conversations.find_one({
        "id": str(conversation_id),
        "user_id": current_user.id
    })
    if not conv_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")
        
    conv = ChatConversation(**conv_dict)
    
    cursor = db.chat_messages.find({
        "conversation_id": str(conversation_id)
    }).sort("created_at", 1)
    
    messages_dict = await cursor.to_list(length=500)
    messages = [ChatMessageResponse(**m) for m in messages_dict]
    
    return {
        "id": conv.id,
        "dataset_id": conv.dataset_id,
        "title": conv.title,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "messages": messages
    }

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_conversation(
    conversation_id: uuid.UUID,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a conversation thread."""
    conv_dict = await db.chat_conversations.find_one({
        "id": str(conversation_id),
        "user_id": current_user.id
    })
    if not conv_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")
        
    await db.chat_conversations.delete_one({"id": str(conversation_id)})
    await db.chat_messages.delete_many({"conversation_id": str(conversation_id)})
    return {"message": "Conversation deleted successfully."}

@router.post("/conversations/{conversation_id}/message", response_model=ChatMessageResponse)
async def send_message(
    conversation_id: uuid.UUID,
    msg_in: ChatMessageCreate,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Sends a message to the AI agent, executing a sandboxed pandas query if needed."""
    conv_dict = await db.chat_conversations.find_one({
        "id": str(conversation_id),
        "user_id": current_user.id
    })
    if not conv_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")
        
    conv = ChatConversation(**conv_dict)
    
    dataset_dict = await db.datasets.find_one({"id": conv.dataset_id})
    if not dataset_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backing dataset deleted.")
        
    dataset = Dataset(**dataset_dict)
    
    # Save User message
    user_msg = ChatMessage(
        conversation_id=str(conversation_id),
        role="user",
        content=msg_in.content
    )
    await db.chat_messages.insert_one(user_msg.model_dump())
    
    # Trigger AI generation
    provider = msg_in.ai_provider or settings.DEFAULT_AI_PROVIDER
    active_path = dataset.cleaned_file_path or dataset.file_path
    
    schema_desc = []
    for col, meta in dataset.columns_metadata.items():
        schema_desc.append(f"- {col} ({meta['type']})")
    schema_desc_str = "\n".join(schema_desc)
        
    # STAGE 1: Code Generation Prompt
    code_gen_prompt = f"""
    You are an AI Data Analyst. You must write a Python script using pandas to analyze a DataFrame named `df` to address the user's query:
    "{msg_in.content}"
    
    The DataFrame `df` is already loaded in the environment. Here is its column schema:
    {schema_desc_str}
    
    Your script must store outputs in these global variable names:
    - `result_text`: (string) Clear description answering the query.
    - `result_df`: (pandas DataFrame) Summary table data (if appropriate).
    - `result_chart`: (plotly Figure) Plotly chart object (if appropriate). For example, create a figure via `px.bar`, `px.line`, `px.scatter`, etc. and set it to `result_chart`.
    
    Example code pattern:
    ```python
    summary = df.groupby('category')['sales'].sum().reset_index()
    result_df = summary
    result_text = f"Top category is {{summary.iloc[0]['category']}}"
    import plotly.express as px
    result_chart = px.bar(summary, x='category', y='sales', title="Category Sales")
    ```
    
    CRITICAL: Output ONLY valid Python code wrapped inside a ```python ``` markdown block. Do not write explanations outside the code block.
    """
    
    try:
        raw_code_response = ai_service.generate_completion(code_gen_prompt, provider=provider)
        
        # Execute sandbox
        sandbox_res = SandboxService.execute_query(active_path, raw_code_response)
        
        # STAGE 2: Polishing Prompt
        polish_prompt = f"""
        You are a Premium Executive Business Analyst. Present the results of this data query to the user.
        
        User Query: "{msg_in.content}"
        
        Pandas Analysis Code Executed:
        {raw_code_response}
        
        Execution Output / Prints:
        {sandbox_res.get('stdout', '')}
        
        Resulting Text:
        {sandbox_res.get('result_text', '')}
        
        Resulting Table (first 5 rows):
        {str((sandbox_res.get('result_table') or [])[:5])}
        
        Chart generated: {"Yes" if sandbox_res.get('result_chart') else "No"}
        
        Please synthesize this into a premium markdown response.
        Provide:
        1. A direct, clear answer to the user's query.
        2. Bulleted key business takeaways/insights from the results.
        3. Strategic recommendations based on the findings (how they can action this data).
        
        Tone: Professional, direct, and elite (inspired by McKinsey and Notion).
        """
        
        final_markdown = ai_service.generate_completion(polish_prompt, provider=provider)
        
        # Save Assistant response
        assistant_msg = ChatMessage(
            conversation_id=str(conversation_id),
            role="assistant",
            content=final_markdown,
            chart_data=sandbox_res.get("result_chart"),
            table_data=sandbox_res.get("result_table")
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())
        
        # Update thread title and timestamp
        title_update = msg_in.content[:50] if len(conv.title) <= 5 or conv.title == "Workspace Chat" else conv.title
        await db.chat_conversations.update_one(
            {"id": str(conversation_id)},
            {"$set": {
                "title": title_update,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return assistant_msg
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI agent failed to execute query: {e}"
        )
