from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, PasswordReset

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db = Depends(get_db)):
    """Registers a new user and hashes their password."""
    # Check if user already exists in MongoDB
    existing_user = await db.users.find_one({"email": user_in.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
        
    # Check if first user, make them admin for convenience
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "user"
    
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=role,
        is_active=True
    )
    
    await db.users.insert_one(db_user.model_dump())
    return db_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    """OAuth2 compatible token login, returning JWT access token."""
    user_dict = await db.users.find_one({"email": form_data.username})
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = User(**user_dict)
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(user.id, expires_delta=access_token_expires)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(reset: PasswordReset, db = Depends(get_db)):
    """Sends password reset instruction logs (mock utility)."""
    user_dict = await db.users.find_one({"email": reset.email})
    if not user_dict:
        return {"message": "If this email exists in our records, a reset link was sent."}
    
    print(f"[Reset Request] Password reset triggered for {user_dict['email']}")
    return {"message": "If this email exists in our records, a reset link was sent."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the profile object of the active session holder."""
    return current_user
