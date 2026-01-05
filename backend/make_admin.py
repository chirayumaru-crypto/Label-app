from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.models import User, UserRole
from app.core.security import get_password_hash

def make_admin():
    db = SessionLocal()
    email = "admin@lenskart.com"
    
    user = db.query(User).filter(User.email == email).first()
    
    new_password = "ADMIN@LK"
    
    if user:
        print(f"User {email} found. Updating role to ADMIN and resetting password.")
        user.role = UserRole.ADMIN
        user.password_hash = get_password_hash(new_password)
        db.commit()
        print(f"Update complete. Password is now '{new_password}'.")
    else:
        print(f"User {email} not found. Creating new ADMIN user.")
        new_user = User(
            name="Lenskart Admin",
            email=email,
            password_hash=get_password_hash(new_password),
            role=UserRole.ADMIN
        )
        db.add(new_user)
        db.commit()
        print(f"User {email} created with password '{new_password}'.")
    
    db.close()

if __name__ == "__main__":
    make_admin()
