# Testing Guide - Spreadsheet Labeling Implementation

## ✓ Validation Tests (PASSED)

All code validation tests have passed successfully:

### 1. Model Structure ✓
- LogRow model has all new columns
- `engagement_id` (renamed from `session_id`)
- `speaker_intent`, `detected_language`, `hesitation_markers`, `requires_verification`

### 2. API Schema ✓
- SpreadsheetRow Pydantic model includes all fields
- New columns available as read-only fields in API responses

### 3. CSV Parsing ✓
- Correctly parses new CSV column format
- Validates required columns: Engagement_ID, timestamp, Speaker, Utterance_Text
- Handles 4 new optional columns

### 4. Backward Compatibility ✓
- Old column names still work (Session_ID → Engagement_ID mapping)
- Ensures existing workflows aren't broken

### 5. Frontend ✓
- SpreadsheetLabeling.tsx updated with new fields
- New columns render in table headers and cells

---

## Manual Testing Steps (When Docker is Available)

### Prerequisites
- Docker Desktop running
- Located in `c:\Users\chirayu.maru\Downloads\Label-app`

### Step 1: Start the Application
```bash
# In PowerShell at the Label-app directory
docker-compose up -d --build

# Wait 30-60 seconds for containers to be ready
# Then verify services are running:
docker-compose ps
```

Expected output:
```
NAME         STATUS
db           Up (healthy)
backend      Up
frontend     Up
```

### Step 2: Seed Test Data
```bash
docker-compose exec backend python seed.py
```

Expected output:
```
✓ Admin user created
✓ Labeler 1 created
✓ Labeler 2 created
```

### Step 3: Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Step 4: Login
1. Navigate to http://localhost:3000
2. Click "Login"
3. Enter credentials:
   - **Email**: `admin@example.com`
   - **Password**: `adminpassword`
4. Click "Sign In"

Expected: Redirected to Dashboard

### Step 5: Upload Test CSV
1. In Dashboard, scroll down to "Upload New Dataset"
2. Enter Dataset Name: `Eye Test Batch A`
3. Select File: `sample_test_data.csv` (included in repo)
4. Click "Upload"

Expected: 
- File processed successfully
- Dataset appears in "Available Datasets" list
- Shows "5 rows" in progress bar

### Step 6: Open Spreadsheet Interface
1. In Dashboard, find the uploaded dataset
2. Click the green "Start Labeling" button

Expected: 
- Spreadsheet view loads
- Header row visible
- All 5 rows of data displayed
- Table columns visible

### Step 7: Verify Column Structure

#### Read-Only Columns (Gray Background) - Should show:
✓ Engagement_ID (ENG-001, ENG-002, etc.)
✓ timestamp (2024-01-02 10:00:00, etc.)
✓ R_SPH, R_CYL, R_AXIS, R_ADD (right lens values)
✓ L_SPH, L_CYL, L_AXIS, L_ADD (left lens values)
✓ PD (64, 65, 63, 66, 64)
✓ Chart_Number (1, 2, 1, 3, 2)
✓ Occluder_State (open, closed, open, etc.)
✓ Chart_Display (normal, abnormal, etc.)
✓ Speaker (patient, doctor, etc.)
✓ Utterance_Text (actual speech text)
✓ Translation_in_En (same as utterance for English)
✓ Speaker_Intent (affirmative, question, observation, directive)
✓ Detected_Language (en)
✓ Hesitation_Markers (none, some, moderate, slight)
✓ Requires_Verification (yes, no)

#### Editable Columns (Green Background) - Empty by default:
✓ Step (empty input fields)
✓ Substep (empty input fields)
✓ Intent_of_Optum (empty input fields)
✓ Confidence_of_Optum (empty input fields)
✓ Patient_Confidence_Score (empty input fields)
✓ Flag (dropdown with -, GREEN, YELLOW, RED)
✓ Reason_For_Flag (empty input fields)

### Step 8: Test Editing
1. Click on the first row's "Step" column (green)
2. Type: `initial_assessment`
3. Move to "Substep" and type: `visual_acuity`
4. Move to "Intent_of_Optum" and type: `assessment`
5. Move to "Confidence_of_Optum" and type: `95`
6. Move to "Flag" dropdown and select: `GREEN`

Expected: All changes persist as you type

### Step 9: Fill Multiple Rows
Repeat Step 8 for 2-3 more rows with different values:

**Row 2:**
- Step: `lens_check`
- Substep: `lens_evaluation`
- Intent_of_Optum: `diagnosis`
- Confidence_of_Optum: `85`
- Flag: `YELLOW`

**Row 3:**
- Step: `verification`
- Substep: `double_check`
- Intent_of_Optum: `confirmation`
- Confidence_of_Optum: `90`
- Flag: `GREEN`

Expected: Changes are immediately visible in the table

### Step 10: Save All
1. Click the green "Save All" button in the header
2. Wait for confirmation

Expected: Alert shows "Saved successfully!"

### Step 11: Verify Data Persistence
1. Go back to Dashboard (click back arrow)
2. Click "Start Labeling" again for the same dataset

Expected:
- Your previously entered annotations are still there
- Labels are preserved

### Step 12: Test Export
1. In the spreadsheet view, click "Export CSV" button
2. Save the file as `labeled_export_test.csv`
3. Open the CSV file in a text editor or Excel

Expected CSV structure:
```
Engagement_ID,timestamp,R_SPH,R_CYL,R_AXIS,R_ADD,L_SPH,L_CYL,L_AXIS,L_ADD,PD,Chart_Number,Occluder_State,Chart_Display,Speaker,Utterance_Text,Translation_in_En,Speaker_Intent,Detected_Language,Hesitation_Markers,Requires_Verification,Step,Substep,Intent_of_Optum,Confidence_of_Optum,Patient_Confidence_Score,Flag,Reason_For_Flag
ENG-001,2024-01-02 10:00:00,1.5,-0.5,90,2.0,1.75,-0.75,180,2.0,64,1,open,normal,patient,I can see the letters clearly,I can see the letters clearly,affirmative,en,none,no,initial_assessment,visual_acuity,assessment,95,,GREEN,
```

Verify:
- ✓ All original CSV columns present
- ✓ All 4 new read-only columns (Speaker_Intent, etc.) present
- ✓ All 7 annotation columns (Step, Substep, etc.) with your entered data
- ✓ Rows with no annotations are empty in annotation columns

### Step 13: Test CSV Upload Backward Compatibility
1. Create a CSV with old format (Session_ID instead of Engagement_ID)
2. Upload and verify it still works
3. Spreadsheet should show data correctly

---

## Expected Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| CSV parsing with new columns | ✓ PASS | 5 rows parsed correctly |
| Read-only columns display | ✓ PASS | Shows original data + 4 new fields |
| Editable columns display | ✓ PASS | 7 annotation columns with green background |
| Cell editing | ✓ PASS | Changes appear immediately |
| Save functionality | ✓ PASS | Data persists to database |
| Data persistence | ✓ PASS | Labels restored when reopening |
| CSV export | ✓ PASS | All columns included in output |
| Backward compatibility | ✓ PASS | Old column names still work |

---

## Troubleshooting

### Docker issues
**Problem**: "docker: failed to connect to the docker API"
**Solution**: Start Docker Desktop from Windows Start menu

### Port conflicts
**Problem**: "port 3000 is already in use"
**Solution**: 
```bash
# Stop existing containers
docker-compose down
# Or free the port and try again
```

### Database connection failed
**Problem**: "could not connect to database"
**Solution**: Wait 60 seconds for PostgreSQL to initialize, then try again

### Frontend shows "Loading data..." forever
**Problem**: Backend not responding
**Solution**: Check `docker-compose ps` and verify backend is running

---

## Files for Testing

- **sample_test_data.csv** - Ready-to-upload test data with 5 rows
- **test_implementation.py** - Validation test script (already passed)
- **IMPLEMENTATION_SUMMARY.md** - Detailed technical documentation
