from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from ..database import get_db
from ..models.models import LogRow, RowAssignment, Label, User, AssignmentStatus
from ..schemas.schemas import LogRowOut, LabelCreate, LabelOut
from .auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/labeling", tags=["labeling"])

from sqlalchemy import func

LOCK_TIMEOUT_MINUTES = 15

@router.post("/next", response_model=LogRowOut)
def get_next_row(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Release expired locks
    timeout_threshold = datetime.utcnow() - timedelta(minutes=LOCK_TIMEOUT_MINUTES)
    db.query(RowAssignment).filter(
        RowAssignment.status == AssignmentStatus.IN_PROGRESS,
        RowAssignment.assigned_at < timeout_threshold
    ).delete()
    db.commit()

    # 2. Check if user already has a row locked
    existing_assignment = db.query(RowAssignment).filter(
        RowAssignment.assigned_to == current_user.id,
        RowAssignment.status == AssignmentStatus.IN_PROGRESS
    ).first()
    
    if existing_assignment:
        return db.query(LogRow).filter(LogRow.id == existing_assignment.log_row_id).first()

    # 3. Find an unassigned row that needs labeling
    # Criteria:
    # A. Not labeled by current user previously.
    # B. Not currently locked by ANY user (enforce Single Writer per Row at a time, though multiple eventually).
    # C. Total labels < 5.
    
    # Subquery: Rows labeled by current user
    rows_labeled_by_user = db.query(Label.log_row_id).filter(Label.labeled_by == current_user.id)
    
    # Subquery: Rows currently locked by ANY user
    rows_locked = db.query(RowAssignment.log_row_id).filter(RowAssignment.status == AssignmentStatus.IN_PROGRESS)
    
    # Subquery: Rows with >= 5 labels
    rows_fully_labeled = db.query(Label.log_row_id).group_by(Label.log_row_id).having(func.count(Label.id) >= 5)

    # Combine exclusions
    excluded_rows = rows_labeled_by_user.union(rows_locked).union(rows_fully_labeled)
    
    # Query for candidate
    next_row = db.query(LogRow).filter(
        ~LogRow.id.in_(excluded_rows)
    ).order_by(LogRow.id).first()
    # Improvement: We could order by 'number of labels' to finish rows that are almost done, 
    # but simple ID order is fine for now.
    
    if not next_row:
        raise HTTPException(status_code=404, detail="No more rows available for you to label")

    # 4. Lock it
    assignment = RowAssignment(
        log_row_id=next_row.id,
        assigned_to=current_user.id,
        status=AssignmentStatus.IN_PROGRESS
    )
    db.add(assignment)
    db.commit()
    
    return next_row

@router.post("/submit", response_model=LabelOut)
def submit_label(label_in: LabelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify assignment
    assignment = db.query(RowAssignment).filter(
        RowAssignment.log_row_id == label_in.log_row_id,
        RowAssignment.assigned_to == current_user.id,
        RowAssignment.status == AssignmentStatus.IN_PROGRESS
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=403, detail="Row not assigned to you or session expired")

    # Save Label
    db_label = Label(
        log_row_id=label_in.log_row_id,
        labeled_by=current_user.id,
        step=label_in.step,
        substep=label_in.substep,
        intent_of_optum=label_in.intent_of_optum,
        confidence_of_optum=label_in.confidence_of_optum,
        patient_confidence_score=label_in.patient_confidence_score,
        flag=label_in.flag,
        reason_for_flag=label_in.reason_for_flag
    )
    db.add(db_label)
    
    # Remove lock so other users can eventually label this row (if < 5 labels)
    db.delete(assignment)
    db.commit()
    db.refresh(db_label)
    return db_label

@router.post("/release")
def release_row(log_row_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignment = db.query(RowAssignment).filter(
        RowAssignment.log_row_id == log_row_id,
        RowAssignment.assigned_to == current_user.id,
        RowAssignment.status == AssignmentStatus.IN_PROGRESS
    ).first()
    
    if assignment:
        db.delete(assignment)
        db.commit()
    return {"status": "released"}
