from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import Dataset, LogRow, Label, User, UserRole
from sqlalchemy import func
from ..schemas.schemas import LogRowOut
from .auth import get_current_user
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/spreadsheet", tags=["spreadsheet"])

class SpreadsheetRow(BaseModel):
    id: int
    engagement_id: str
    timestamp: str
    r_sph: str
    r_cyl: str
    r_axis: str
    r_add: str
    l_sph: str
    l_cyl: str
    l_axis: str
    l_add: str
    pd: str
    chart_number: str
    occluder_state: str
    chart_display: str
    speaker: str
    utterance_text: str
    translation_in_en: str
    speaker_intent: str = ""
    detected_language: str = ""
    hesitation_markers: str = ""
    requires_verification: str = ""
    step: str = ""
    substep: str = ""
    intent_of_optum: str = ""
    confidence_of_optum: str = ""
    patient_confidence_score: str = ""
    flag: str = ""
    reason_for_flag: str = ""

class SaveLabelsRequest(BaseModel):
    rows: List[SpreadsheetRow]

class UserProgress(BaseModel):
    user_id: str
    name: str
    email: str
    labeled_count: int
    percentage: int

@router.get("/{dataset_id}/rows", response_model=List[SpreadsheetRow])
def get_dataset_rows(
    dataset_id: int, 
    target_user_id: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get all rows for a dataset in spreadsheet format"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Admin Review Logic
    viewer_id = current_user.id
    if target_user_id:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can view other users' work")
        viewer_id = target_user_id
    
    rows = db.query(LogRow).filter(LogRow.dataset_id == dataset_id).order_by(LogRow.row_index).all()
    
    result = []
    for row in rows:
        # Get existing label if any (filtered by viewer_id)
        label = db.query(Label).filter(Label.log_row_id == row.id, Label.labeled_by == viewer_id).first()
        
        result.append(SpreadsheetRow(
            id=row.id,
            engagement_id=row.engagement_id or "",
            timestamp=row.timestamp or "",
            r_sph=row.r_sph or "",
            r_cyl=row.r_cyl or "",
            r_axis=row.r_axis or "",
            r_add=row.r_add or "",
            l_sph=row.l_sph or "",
            l_cyl=row.l_cyl or "",
            l_axis=row.l_axis or "",
            l_add=row.l_add or "",
            pd=row.pd or "",
            chart_number=row.chart_number or "",
            occluder_state=row.occluder_state or "",
            chart_display=row.chart_display or "",
            speaker=row.speaker or "",
            utterance_text=row.utterance or "",
            translation_in_en=row.translation_in_en or "",
            speaker_intent=row.speaker_intent or "",
            detected_language=row.detected_language or "",
            hesitation_markers=row.hesitation_markers or "",
            requires_verification=row.requires_verification or "",
            step=label.step if label else "",
            substep=label.substep if label else "",
            intent_of_optum=label.intent_of_optum if label else "",
            confidence_of_optum=str(label.confidence_of_optum) if label else "",
            patient_confidence_score=str(label.patient_confidence_score) if label else "",
            flag=label.flag.value if label else "",
            reason_for_flag=label.reason_for_flag if label else ""
        ))
    
    return result

@router.post("/{dataset_id}/save")
def save_labels(dataset_id: int, request: SaveLabelsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Save all labels from spreadsheet"""
    for row_data in request.rows:
        # Skip rows with no annotations
        if not any([row_data.step, row_data.intent_of_optum]):
            continue
            
        # Check if label already exists
        existing_label = db.query(Label).filter(
            Label.log_row_id == row_data.id,
            Label.labeled_by == current_user.id
        ).first()
        
        if existing_label:
            # Update existing
            existing_label.step = row_data.step
            existing_label.substep = row_data.substep
            existing_label.intent_of_optum = row_data.intent_of_optum
            existing_label.confidence_of_optum = int(row_data.confidence_of_optum) if row_data.confidence_of_optum else 0
            existing_label.patient_confidence_score = int(row_data.patient_confidence_score) if row_data.patient_confidence_score else 0
            existing_label.flag = row_data.flag if row_data.flag else "NONE"
            existing_label.reason_for_flag = row_data.reason_for_flag
        else:
            # Create new
            new_label = Label(
                log_row_id=row_data.id,
                labeled_by=current_user.id,
                step=row_data.step,
                substep=row_data.substep,
                intent_of_optum=row_data.intent_of_optum,
                confidence_of_optum=int(row_data.confidence_of_optum) if row_data.confidence_of_optum else 0,
                patient_confidence_score=int(row_data.patient_confidence_score) if row_data.patient_confidence_score else 0,
                flag=row_data.flag if row_data.flag else "NONE",
                reason_for_flag=row_data.reason_for_flag
            )
            db.add(new_label)
    
    db.commit()
    return {"status": "success", "message": "Labels saved successfully"}

@router.get("/{dataset_id}/export")
def export_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export dataset with labels as CSV"""
    from fastapi.responses import StreamingResponse
    import io
    import csv
    
    rows = db.query(LogRow).filter(LogRow.dataset_id == dataset_id).order_by(LogRow.row_index).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Engagement_ID', 'timestamp', 'R_SPH', 'R_CYL', 'R_AXIS', 'R_ADD',
        'L_SPH', 'L_CYL', 'L_AXIS', 'L_ADD', 'PD', 'Chart_Number',
        'Occluder_State', 'Chart_Display', 'Speaker', 'Utterance_Text',
        'Translation_in_En', 'Speaker_Intent', 'Detected_Language',
        'Hesitation_Markers', 'Requires_Verification', 'Step', 'Substep', 'Intent_of_Optum',
        'Confidence_of_Optum', 'Patient_Confidence_Score', 'Flag', 'Reason_For_Flag'
    ])
    
    # Write data
    for row in rows:
        label = db.query(Label).filter(Label.log_row_id == row.id, Label.labeled_by == current_user.id).first()
        
        writer.writerow([
            row.engagement_id, row.timestamp, row.r_sph, row.r_cyl, row.r_axis, row.r_add,
            row.l_sph, row.l_cyl, row.l_axis, row.l_add, row.pd, row.chart_number,
            row.occluder_state, row.chart_display, row.speaker, row.utterance, 
            row.translation_in_en, row.speaker_intent, row.detected_language,
            row.hesitation_markers, row.requires_verification,
            label.step if label else "",
            label.substep if label else "",
            label.intent_of_optum if label else "",
            label.confidence_of_optum if label else "",
            label.patient_confidence_score if label else "",
            label.flag.value if label else "",
            label.reason_for_flag if label else ""
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=dataset_{dataset_id}_labeled.csv"}
    )

@router.get("/{dataset_id}/progress", response_model=List[UserProgress])
def get_dataset_progress(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
         raise HTTPException(status_code=403, detail="Only admins can view progress")
    
    # 1. Get total rows in dataset
    total_rows = db.query(LogRow).filter(LogRow.dataset_id == dataset_id).count()
    if total_rows == 0: return []
    
    # 2. Group labels by user
    stats = db.query(Label.labeled_by, func.count(Label.id))\
        .join(LogRow)\
        .filter(LogRow.dataset_id == dataset_id)\
        .group_by(Label.labeled_by).all()
        
    results = []
    for user_id, count in stats:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            pct = int((count / total_rows) * 100)
            results.append(UserProgress(
                user_id=str(user.id), 
                name=str(user.name), 
                email=str(user.email), 
                labeled_count=count, 
                percentage=min(100, pct)
            ))
            
    return results
