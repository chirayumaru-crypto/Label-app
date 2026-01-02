from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float, Enum, Boolean, Index
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum
from .base import Base

class UserRole(str, enum.Enum):
    LABELER = "labeler"
    REVIEWER = "reviewer"
    ADMIN = "admin"

class AssignmentStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    RELEASED = "RELEASED"

class LabelFlag(str, enum.Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.LABELER)

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    rows = relationship("LogRow", back_populates="dataset")

class LogRow(Base):
    __tablename__ = "log_rows"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    row_index = Column(Integer)

    # Immutable Log Fields
    engagement_id = Column(String)
    timestamp = Column(String)
    
    r_sph = Column(String)
    r_cyl = Column(String)
    r_axis = Column(String)
    r_add = Column(String)
    
    l_sph = Column(String)
    l_cyl = Column(String)
    l_axis = Column(String)
    l_add = Column(String)
    
    pd = Column(String)
    chart_number = Column(String)
    occluder_state = Column(String)
    chart_display = Column(String)
    
    speaker = Column(String)
    utterance = Column(String)
    translation_in_en = Column(String)
    speaker_intent = Column(String)
    detected_language = Column(String)
    hesitation_markers = Column(String)
    requires_verification = Column(String)

    dataset = relationship("Dataset", back_populates="rows")
    labels = relationship("Label", back_populates="log_row")
    assignments = relationship("RowAssignment", back_populates="log_row")

class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, index=True)
    log_row_id = Column(Integer, ForeignKey("log_rows.id"))
    labeled_by = Column(String, ForeignKey("users.id"))
    
    step = Column(String, nullable=False)
    substep = Column(String)
    intent_of_optum = Column(String, nullable=False)
    confidence_of_optum = Column(Integer)
    patient_confidence_score = Column(Integer)
    flag = Column(Enum(LabelFlag), nullable=False)
    reason_for_flag = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    log_row = relationship("LogRow", back_populates="labels")

class RowAssignment(Base):
    __tablename__ = "row_assignments"

    id = Column(Integer, primary_key=True, index=True)
    log_row_id = Column(Integer, ForeignKey("log_rows.id"))
    assigned_to = Column(String, ForeignKey("users.id"))
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.IN_PROGRESS)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_assignment_row_user', 'log_row_id', 'assigned_to', unique=True),
    )

    log_row = relationship("LogRow", back_populates="assignments")
