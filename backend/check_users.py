from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.models import User, Label, Dataset
from sqlalchemy import func

def check_users():
    db = SessionLocal()
    try:
        print("\n--- Users & Labeling Progress ---")
        users = db.query(User).all()
        for user in users:
            label_count = db.query(Label).filter(Label.labeled_by == user.id).count()
            print(f"User: {user.name} ({user.email}) | Role: {user.role} | Total Labels: {label_count}")
        
        print("\n--- Dataset Progress ---")
        datasets = db.query(Dataset).all()
        for ds in datasets:
            total_labels = db.query(Label).filter(Label.log_row.has(dataset_id=ds.id)).count()
            print(f"Dataset: {ds.name} (ID: {ds.id}) | Total Labels: {total_labels}")

    finally:
        db.close()

if __name__ == "__main__":
    check_users()
