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
        'Engagement_ID', 'timestamp', 'Speaker', 'Utterance_Text',
        'R_SPH', 'R_CYL', 'R_AXIS', 'R_ADD',
        'L_SPH', 'L_CYL', 'L_AXIS', 'L_ADD',
        'PD', 'Chart_Number', 'Occluder_State', 'Chart_Display',
        'Translation_in_En', 'Speaker_Intent', 'Detected_Language',
        'Hesitation_Markers', 'Requires_Verification'
    ]
    required_cols = ['Engagement_ID', 'timestamp', 'Speaker', 'Utterance_Text']
    
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

    # Drop adjacent duplicates based on clinical columns
    check_cols = [
        'R_SPH', 'R_CYL', 'R_AXIS', 'R_ADD', 'L_SPH', 'L_CYL', 'L_AXIS', 'L_ADD',
        'PD', 'Chart_Number', 'Occluder_State', 'Chart_Display', 'Speaker'
    ]
    available_check_cols = [c for c in check_cols if c in df.columns]
    if available_check_cols:
        # Identify rows that are identical to their immediate predecessor
        # fillna ensures that empty cells (NaN) are compared correctly
        is_duplicate = (df[available_check_cols].fillna('').shift() == df[available_check_cols].fillna('')).all(axis=1)
        df = df[~is_duplicate].reset_index(drop=True)
        print(f"Removed {is_duplicate.sum()} adjacent duplicate rows")

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
    datasets = db.query(Dataset).all()
    results = []
    
    for ds in datasets:
        total_rows = db.query(LogRow).filter(LogRow.dataset_id == ds.id).count()
        # Count unique log rows that have at least one label
        distinct_labeled_rows = db.query(func.count(func.distinct(Label.log_row_id)))\
            .join(LogRow)\
            .filter(LogRow.dataset_id == ds.id).scalar() or 0
        
        total_labels = distinct_labeled_rows # Use unique rows for progress bar logic
        
        # Target labels = Total Rows * 5
        target_labels = total_rows * 5
        is_completed = total_labels >= target_labels if total_rows > 0 else False
        
        # Hide completed datasets from non-admin users
        if is_completed and current_user.role != UserRole.ADMIN:
            continue
            
        ds.total_rows = total_rows
        ds.labeled_count = total_labels # This effectively tracks 'labels done' not 'rows done', but works for progress.
        results.append(ds)
        
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

