from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.models import Dataset, LogRow, User, UserRole, Label
from ..schemas.schemas import DatasetOut
from .auth import get_current_user
import pandas as pd
import io
from typing import List

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.post("/upload", response_model=DatasetOut)
async def upload_dataset(
    name: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Restrict upload to only admin
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can upload datasets.")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    # Strip whitespace from headers and replace spaces with underscores
    df.columns = df.columns.str.strip().str.replace(' ', '_')
    print(f"Received columns: {df.columns.tolist()}")

    
    # Normalize columns (case-insensitive)
    expected_cols = [
        'timestamp', 'Speaker', 'Utterance_Text',
        'R_SPH', 'R_CYL', 'R_AXIS', 'R_ADD',
        'L_SPH', 'L_CYL', 'L_AXIS', 'L_ADD',
        'PD', 'Chart_Number', 'Occluder_State', 'Chart_Display',
        'Translation_in_En', 'Speaker_Intent', 'Detected_Language',
        'Hesitation_Markers', 'Requires_Verification'
    ]
    required_cols = ['timestamp', 'Speaker', 'Utterance_Text']
    
    # Column Aliases
    aliases = {
        'Utterance': 'Utterance_Text',
        'transcription': 'Utterance_Text',
        'text': 'Utterance_Text',
        'speaker_id': 'Speaker', 
        'session': 'Engagement_ID',
        'Session_ID': 'Engagement_ID',
        'session_id': 'Engagement_ID'
    }
    
    # Rename aliases first
    df.rename(columns=aliases, inplace=True)

    for target_col in expected_cols:
        if target_col not in df.columns:
            for actual_col in df.columns:
                if actual_col.lower() == target_col.lower():
                    df.rename(columns={actual_col: target_col}, inplace=True)
                    break
        
        if target_col in required_cols and target_col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: {target_col}")


    # Remove rows where speaker == 'Patient'
    if 'Speaker' in df.columns:
        before_count = len(df)
        df = df[df['Speaker'].str.strip().str.lower() != 'patient'].reset_index(drop=True)
        print(f"Removed {before_count - len(df)} rows where speaker == 'Patient'.")

    # Remove Engagement_ID column if present
    if 'Engagement_ID' in df.columns:
        df.drop(columns=['Engagement_ID'], inplace=True)

    # Deduplicate adjacent rows based on specified columns
    dedup_cols = [
        'R_SPH', 'R_CYL', 'R_AXIS', 'R_ADD',
        'L_SPH', 'L_CYL', 'L_AXIS', 'L_ADD',
        'PD', 'Chart_Number', 'Occluder_State', 'Chart_Display'
    ]
    existing_dedup_cols = [c for c in dedup_cols if c in df.columns]
    if existing_dedup_cols:
        df_dedup = df[existing_dedup_cols].fillna("")
        mask = (df_dedup == df_dedup.shift()).all(axis=1)
        df = df[~mask].reset_index(drop=True)
        print(f"Deduplicated: Dropped {mask.sum()} adjacent duplicate rows.")

    dataset = Dataset(name=name, uploaded_by=current_user.id)
    db.add(dataset)
    db.flush() # Get dataset id

    log_rows = []
    for index, row in df.iterrows():
        log_row = LogRow(
            dataset_id=dataset.id,
            row_index=index,
            engagement_id=str(row.get('Engagement_ID', '')),
            timestamp=str(row.get('timestamp', '')),
            r_sph=str(row.get('R_SPH', '')),
            r_cyl=str(row.get('R_CYL', '')),
            r_axis=str(row.get('R_AXIS', '')),
            r_add=str(row.get('R_ADD', '')),
            l_sph=str(row.get('L_SPH', '')),
            l_cyl=str(row.get('L_CYL', '')),
            l_axis=str(row.get('L_AXIS', '')),
            l_add=str(row.get('L_ADD', '')),
            pd=str(row.get('PD', '')),
            chart_number=str(row.get('Chart_Number', '')),
            occluder_state=str(row.get('Occluder_State', '')),
            chart_display=str(row.get('Chart_Display', '')),
            speaker=str(row.get('Speaker', '')),
            utterance=str(row.get('Utterance_Text', '')),
            translation_in_en=str(row.get('Translation_in_En', '')),
            speaker_intent=str(row.get('Speaker_Intent', '')),
            detected_language=str(row.get('Detected_Language', '')),
            hesitation_markers=str(row.get('Hesitation_Markers', '')),
            requires_verification=str(row.get('Requires_Verification', ''))
        )
        log_rows.append(log_row)
    
    db.bulk_save_objects(log_rows)
    db.commit()
    db.refresh(dataset)
    return dataset

from ..models.models import Label, UserRole
from sqlalchemy import func

@router.get("/", response_model=List[DatasetOut])
def list_datasets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """ List all datasets with their progress. Optimized to handle 1000+ records. """
    is_admin = current_user.role == UserRole.ADMIN
    
    # Efficiently fetch everything in one go:
    # 1. Dataset fields
    # 2. Count of total rows (count LogRow)
    # 3. Count of uniquely labeled rows (count distinct Label.log_row_id)
    # 4. Count of unique labelers (count distinct Label.labeled_by)
    
    query = db.query(
        Dataset.id,
        Dataset.name,
        Dataset.uploaded_at,
        func.count(func.distinct(LogRow.id)).label("total_rows"),
        func.count(func.distinct(Label.log_row_id)).label("labeled_count"),
        func.count(func.distinct(Label.labeled_by)).label("labelers_count")
    ).outerjoin(LogRow, LogRow.dataset_id == Dataset.id)\
     .outerjoin(Label, Label.log_row_id == LogRow.id)\
     .group_by(Dataset.id)\
     .order_by(Dataset.uploaded_at.desc())

    raw_results = query.all()
    
    results = []
    for row in raw_results:
        # Hide if >= 5 labelers and user is NOT admin
        if not is_admin and (row.labelers_count or 0) >= 5:
            continue
            
        results.append({
            "id": row.id,
            "name": row.name,
            "uploaded_at": row.uploaded_at,
            "total_rows": row.total_rows or 0,
            "labeled_count": row.labeled_count or 0,
            "labelers_count": row.labelers_count or 0
        })

    # Shuffling for labelers only (prevent everyone working on the same thing)
    if not is_admin:
        import random
        random.shuffle(results)
        
    return results

@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can delete datasets")
    
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Cascade delete is handled by database usually, but we might need to manually delete if relationships aren't set to cascade
    # Deleting the dataset should delete log_rows. Labels might need manual deletion if not cascaded.
    # For now, let's assume standard SQLAlchemy cascade or manual deletion
    
    # Manually delete related items to be safe
    # 1. Delete Labels
    db.query(Label).filter(Label.log_row.has(dataset_id=dataset_id)).delete(synchronize_session=False)
    # 2. Delete LogRows
    db.query(LogRow).filter(LogRow.dataset_id == dataset_id).delete(synchronize_session=False)
    # 3. Delete Dataset
    db.delete(dataset)
    db.commit()
    return None

