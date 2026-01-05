from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from .models.base import Base

# Get the absolute path to the directory where this file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Go up one level to the 'app' directory, then up again to the 'backend' directory
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
DATABASE_PATH = os.path.join(PROJECT_ROOT, "labelapp.db")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

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
