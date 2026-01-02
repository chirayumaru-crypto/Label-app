from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import LogRow, Label, Dataset, User
from .auth import get_current_user
import pandas as pd
import io

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/labeled_csv")
def export_labeled_data(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Join LogRows with their Labels
    query = db.query(LogRow, Label).join(Label, LogRow.id == Label.log_row_id).filter(LogRow.dataset_id == dataset_id)
    
    data = []
    for log_row, label in query.all():
        row_dict = {
            "Session_ID": log_row.session_id,
            "timestamp": log_row.timestamp,
            "R_SPH": log_row.r_sph,
            "R_CYL": log_row.r_cyl,
            "R_AXIS": log_row.r_axis,
            "R_ADD": log_row.r_add,
            "L_SPH": log_row.l_sph,
            "L_CYL": log_row.l_cyl,
            "L_AXIS": log_row.l_axis,
            "L_ADD": log_row.l_add,
            "PD": log_row.pd,
            "Chart_Number": log_row.chart_number,
            "Occluder_State": log_row.occluder_state,
            "Chart_Display": log_row.chart_display,
            "Speaker": log_row.speaker,
            "Utterance": log_row.utterance,
            "Step": label.step,
            "Substep": label.substep,
            "Intent_of_Optum": label.intent_of_optum,
            "Confidence_of_Optum": label.confidence_of_optum,
            "Patient_Confidence_Score": label.patient_confidence_score,
            "Flag": label.flag,
            "Reason_For_Flag": label.reason_for_flag,
            "Labeled_By": label.labeled_by,
            "Labeled_At": label.created_at
        }
        data.append(row_dict)
    
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename=labeled_dataset_{dataset_id}.csv"
    return response
