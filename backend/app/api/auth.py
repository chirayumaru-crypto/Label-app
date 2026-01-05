from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import User
from ..schemas.schemas import UserCreate, UserOut, Token
from ..core.security import verify_password, get_password_hash, create_access_token
from jose import jwt, JWTError
from ..core.security import SECRET_KEY, ALGORITHM
from uuid import UUID

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    email_lower = user_in.email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = User(
        email=email_lower,
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Auto-login after registration
    access_token = create_access_token(subject=db_user.id)
    return {
        "user": {
            "id": str(db_user.id),
            "email": db_user.email,
            "name": db_user.name,
            "role": db_user.role
        },
        "access_token": access_token, 
        "token_type": "bearer"
    }

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email_lower = form_data.username.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
