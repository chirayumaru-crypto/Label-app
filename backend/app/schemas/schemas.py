from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from ..models.models import UserRole, LabelFlag, AssignmentStatus

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.LABELER

class UserOut(UserBase):
    id: str  # Updated to str for SQLite compatibility
    role: UserRole
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Dataset Schemas
class DatasetOut(BaseModel):
    id: int
    name: str
    uploaded_at: datetime
    total_rows: int = 0
    labeled_count: int = 0
    class Config:
        from_attributes = True

# LogRow Schema
class LogRowOut(BaseModel):
    id: int
    dataset_id: int
    row_index: int
    session_id: Optional[str]
    timestamp: Optional[str]
    r_sph: Optional[str]
    r_cyl: Optional[str]
    r_axis: Optional[str]
    r_add: Optional[str]
    l_sph: Optional[str]
    l_cyl: Optional[str]
    l_axis: Optional[str]
    l_add: Optional[str]
    pd: Optional[str]
    chart_number: Optional[str]
    occluder_state: Optional[str]
    chart_display: Optional[str]
    speaker: Optional[str]
    utterance: Optional[str]
    class Config:
        from_attributes = True

# Label Schemas
class LabelCreate(BaseModel):
    log_row_id: int
    step: str
    substep: Optional[str] = ""
    intent_of_optum: str
    confidence_of_optum: int = Field(ge=0, le=10)
    patient_confidence_score: int = Field(ge=0, le=10)
    flag: LabelFlag
    reason_for_flag: Optional[str] = None

class LabelOut(LabelCreate):
    id: int
    labeled_by: UUID
    created_at: datetime
    class Config:
        from_attributes = True

# Assignment Schema
class RowAssignmentOut(BaseModel):
    log_row_id: int
    assigned_to: UUID
    status: AssignmentStatus
    assigned_at: datetime
    class Config:
        from_attributes = True
