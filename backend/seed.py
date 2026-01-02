from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.models import User, UserRole
from app.core.security import get_password_hash
import uuid

from app.models.base import Base

def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    users = [
        {
            "name": "Admin User",
            "email": "admin@example.com",
            "password": "adminpassword",
            "role": UserRole.ADMIN
        },
        {
            "name": "Labeler One",
            "email": "labeler1@example.com",
            "password": "password123",
            "role": UserRole.LABELER
        },
        {
            "name": "Labeler Two",
            "email": "labeler2@example.com",
            "password": "password123",
            "role": UserRole.LABELER
        }
    ]

    for user_data in users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                role=user_data["role"]
            )
            db.add(user)
            print(f"Created user: {user.email}")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_users()
