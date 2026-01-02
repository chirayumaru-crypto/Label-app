# Implementation Summary - Updated Spreadsheet Labeling Interface

## Overview
Updated the Eye-Test Data Labeling App to support a new CSV column format and implemented a fully functional Excel-like spreadsheet interface for bulk labeling.

## Changes Made

### 1. Backend Database Models
**File**: `backend/app/models/models.py`

**Changes**:
- Renamed `session_id` → `engagement_id` in `LogRow` model
- Added 4 new columns to `LogRow` model:
  - `speaker_intent: String`
  - `detected_language: String`
  - `hesitation_markers: String`
  - `requires_verification: String`

These columns store read-only data from the uploaded CSV and are displayed in the spreadsheet interface.

### 2. CSV Upload Handler
**File**: `backend/app/api/datasets.py`

**Changes**:
- Updated column normalization to handle new CSV format:
  - Changed required columns from `Session_ID` to `Engagement_ID`
  - Changed `Utterance` to `Utterance_Text`
  - Added support for: `Speaker_Intent`, `Detected_Language`, `Hesitation_Markers`, `Requires_Verification`
- Updated column aliases to map `Session_ID` → `Engagement_ID` for backward compatibility
- Modified `LogRow` creation to parse and store all new columns

### 3. Spreadsheet API Endpoints
**File**: `backend/app/api/spreadsheet.py`

**Changes**:
- Updated `SpreadsheetRow` Pydantic schema to include 4 new read-only fields
- **GET** `/spreadsheet/{dataset_id}/rows`:
  - Now returns all new columns with empty defaults
  - Fetches existing labels for the current user
- **POST** `/spreadsheet/{dataset_id}/save`:
  - Unchanged - still saves only annotation columns (step, substep, intent, flag, etc.)
- **GET** `/spreadsheet/{dataset_id}/export`:
  - Export CSV now includes all original CSV data + new columns + user's labels
  - Columns in order: Engagement_ID, timestamp, lens values, chart info, speaker, utterance, translation, Speaker_Intent, Detected_Language, Hesitation_Markers, Requires_Verification, Step, Substep, Intent_of_Optum, Confidence_of_Optum, Patient_Confidence_Score, Flag, Reason_For_Flag

### 4. Frontend Spreadsheet Component
**File**: `frontend/src/pages/SpreadsheetLabeling.tsx`

**Changes**:
- Updated `RowData` interface to include 4 new read-only fields
- Extended table headers to show new columns with gray background (same as other read-only columns)
- Extended table body to render new columns as read-only cells
- All 4 new columns display with `bg-slate-800/30 text-slate-400` styling

## Column Structure in Spreadsheet UI

### Read-Only Columns (Gray Background)
```
Engagement_ID | timestamp | R_SPH | R_CYL | R_AXIS | R_ADD | 
L_SPH | L_CYL | L_AXIS | L_ADD | PD | Chart_Number | 
Occluder_State | Chart_Display | Speaker | Utterance_Text | 
Translation_in_En | Speaker_Intent | Detected_Language | 
Hesitation_Markers | Requires_Verification
```

### Editable Columns (Green Background)
```
Step | Substep | Intent_of_Optum | Confidence_of_Optum | 
Patient_Confidence_Score | Flag | Reason_For_Flag
```

## CSV Input Format (Expected)
```
Engagement_ID | timestamp | R_SPH | R_CYL | R_AXIS | R_ADD | 
L_SPH | L_CYL | L_AXIS | L_ADD | PD | Chart_Number | 
Occluder_State | Chart_Display | Speaker | Utterance_Text | 
Translation_in_En | Speaker_Intent | Detected_Language | 
Hesitation_Markers | Requires_Verification
```

## CSV Export Format
```
[All read-only columns from input CSV] + [User-filled annotation columns]
```

## User Workflow
1. **Login** with credentials (e.g., `admin@example.com`)
2. **Upload CSV** with the new column format from Dashboard
3. **Click "Start Labeling"** → Opens spreadsheet interface with all rows visible
4. **Fill in green columns** (Step, Substep, Intent_of_Optum, etc.) for each row
5. **Click "Save All"** → Persists user's annotations to database
6. **Click "Export CSV"** → Downloads labeled CSV with original data + annotations

## Backward Compatibility
- The app still supports old `Session_ID` column name (automatically maps to `Engagement_ID`)
- Old `Utterance` column name still supported (maps to `Utterance_Text`)
- Missing optional columns (Speaker_Intent, Detected_Language, etc.) default to empty strings

## Database Migration Note
⚠️ **Important**: The database schema has changed. If you have existing data:
- Option 1: Delete the database and restart (dev environment)
- Option 2: Create an Alembic migration to add the new columns to existing `log_rows` table:
  ```sql
  ALTER TABLE log_rows 
  RENAME COLUMN session_id TO engagement_id;
  ALTER TABLE log_rows ADD COLUMN speaker_intent VARCHAR;
  ALTER TABLE log_rows ADD COLUMN detected_language VARCHAR;
  ALTER TABLE log_rows ADD COLUMN hesitation_markers VARCHAR;
  ALTER TABLE log_rows ADD COLUMN requires_verification VARCHAR;
  ```

## Testing Checklist
- [ ] Upload CSV with new column format
- [ ] Verify all columns display correctly in spreadsheet
- [ ] Edit annotation fields and verify they save
- [ ] Export CSV and verify it contains all original + annotation data
- [ ] Test backward compatibility with old `Session_ID` column name
- [ ] Verify new columns render as read-only (gray background)
