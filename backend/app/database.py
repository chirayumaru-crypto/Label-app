from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from .models.base import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./labelapp.db")

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
