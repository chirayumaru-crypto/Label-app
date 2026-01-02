# Architecture Diagram - Updated Spreadsheet Labeling System

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Upload CSV          2. Open Spreadsheet      3. Export      │
│     with new format        Interface              Labeled CSV   │
│                                                                   │
└──────────┬──────────────────────┬─────────────────────┬──────────┘
           │                      │                     │
           ↓                      ↓                     ↓
    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
    │  Dashboard   │    │  Spreadsheet   │    │  Download    │
    │   (React)    │    │   View (React) │    │   CSV File   │
    └──────┬───────┘    └────────┬───────┘    └──────▲───────┘
           │                     │                   │
           │ POST /datasets/     │ GET /spreadsheet/ │
           │ upload              │ {id}/rows         │ GET /spreadsheet/
           │                     │ POST /spreadsheet/│ {id}/export
           │                     │ {id}/save         │
           ↓                     ↓                   │
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI BACKEND                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────┐          │
│  │   datasets.py        │      │  spreadsheet.py      │          │
│  │   ─────────────────  │      │  ─────────────────   │          │
│  │ ▪ Parse CSV          │      │ ▪ GET rows           │          │
│  │ ▪ Validate columns   │      │ ▪ POST save labels   │          │
│  │ ▪ Normalize names    │      │ ▪ GET export CSV     │          │
│  │ ▪ Create LogRows     │      │ ▪ Join Label data    │          │
│  └────────┬─────────────┘      └──────────┬───────────┘          │
│           │                               │                      │
│           └───────────────┬───────────────┘                      │
│                           ↓                                       │
│           ┌────────────────────────────┐                         │
│           │   SQLAlchemy ORM           │                         │
│           │ ───────────────────────    │                         │
│           │ Models:                    │                         │
│           │ • LogRow                   │                         │
│           │ • Label                    │                         │
│           │ • Dataset                  │                         │
│           │ • User                     │                         │
│           └────────────┬────────────────┘                        │
│                        │                                         │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         ↓
            ┌────────────────────────┐
            │   PostgreSQL 15        │
            │  ────────────────────  │
            │  Tables:               │
            │  • users               │
            │  • datasets            │
            │  • log_rows ◄──────────── NEW COLUMNS ADDED
            │  • labels              │
            │  • row_assignments     │
            └────────────────────────┘
```

---

## Data Model - LogRow Table

```
┌─────────────────────────────────────────────────────────────────┐
│                      log_rows TABLE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRIMARY KEYS:                                                  │
│  ├─ id (Integer, PK)                                           │
│  ├─ dataset_id (FK → datasets)                                 │
│  └─ row_index (Integer)                                        │
│                                                                  │
│  IMMUTABLE CSV DATA (Read-Only in Spreadsheet):                │
│  ├─ engagement_id ★ [RENAMED from session_id]                 │
│  ├─ timestamp                                                   │
│  ├─ r_sph, r_cyl, r_axis, r_add                               │
│  ├─ l_sph, l_cyl, l_axis, l_add                               │
│  ├─ pd, chart_number                                           │
│  ├─ occluder_state, chart_display                             │
│  ├─ speaker, utterance, translation_in_en                     │
│  ├─ speaker_intent ★ [NEW]                                    │
│  ├─ detected_language ★ [NEW]                                 │
│  ├─ hesitation_markers ★ [NEW]                                │
│  └─ requires_verification ★ [NEW]                             │
│                                                                  │
│  RELATIONSHIPS:                                                 │
│  ├─ dataset: many-to-one (Dataset)                            │
│  ├─ labels: one-to-many (Label)                               │
│  └─ assignments: one-to-many (RowAssignment)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                          ★ = Modified/New
```

---

## Spreadsheet UI Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER: Spreadsheet Labeling          [Export CSV]  [Save All]          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────── READ-ONLY COLUMNS (Gray) ──────────────────────┐ │
│  │ Engagement_ID │ timestamp │ R_SPH │ R_CYL │ R_AXIS │ R_ADD │ L_SPH │ │
│  ├───────────────┼───────────┼───────┼───────┼────────┼───────┼───────┤ │
│  │ ENG-001       │ 10:00:00  │ 1.50  │-0.50 │   90   │ 2.00  │1.75   │ │
│  │ ENG-002       │ 10:15:00  │ 2.00  │-1.00 │   45   │ 2.25  │2.25   │ │
│  │ ENG-003       │ 10:30:00  │ 0.75  │-0.25 │  180   │ 1.75  │1.25   │ │
│  │               │           │       │       │        │       │        │ │
│  │  ... More Read-Only Columns ...                                      │ │
│  │  L_CYL │ L_AXIS │ L_ADD │ PD │ Chart │ Speaker │ Utterance │ ... │ │
│  │-0.75  │  180   │ 2.00  │ 64 │   1   │ patient │ I see... │     │ │
│  │-1.25  │   135  │ 2.25  │ 65 │   2   │ doctor  │ Can you... │    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌── NEW COLUMNS (Read-Only) ─────┬── EDITABLE COLUMNS (Green) ────────┐ │
│  │Speaker_Intent│Detected_Lan...  │Step│Substep│Intent│Confidence...  │ │
│  ├──────────────┼─────────────────┼─────┼─────────────────────────────┤ │
│  │affirmative   │ en              │[___]│[_____]│[________]│[___]     │ │
│  │question      │ en              │[___]│[_____]│[________]│[___]     │ │
│  │observation   │ en              │[___]│[_____]│[________]│[___]     │ │
│  │              │                 │     │       │          │          │ │
│  │ ... additional editable columns ...                                │ │
│  │ Patient_Confidence │ Flag (dropdown) │ Reason_For_Flag            │ │
│  │[_______________]   │[GREEN▼]        │[_____________________]     │ │
│  │[_______________]   │[YELLOW▼]       │[_____________________]     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## CSV Format - Before and After

### INPUT CSV (User Uploads)
```
Engagement_ID,timestamp,R_SPH,R_CYL,...,Speaker,Utterance_Text,Translation_in_En,Speaker_Intent,Detected_Language,Hesitation_Markers,Requires_Verification
ENG-001,2024-01-02 10:00:00,1.50,-0.50,...,patient,I see clearly,I see clearly,affirmative,en,none,no
ENG-002,2024-01-02 10:15:00,2.00,-1.00,...,doctor,Can you see?,Can you see?,question,en,some,yes
```

### EXPORTED CSV (After Labeling)
```
Engagement_ID,timestamp,R_SPH,...,Speaker_Intent,Detected_Language,Hesitation_Markers,Requires_Verification,Step,Substep,Intent_of_Optum,Confidence_of_Optum,Patient_Confidence_Score,Flag,Reason_For_Flag
ENG-001,2024-01-02 10:00:00,1.50,...,affirmative,en,none,no,initial_assessment,visual_acuity,assessment,95,,GREEN,
ENG-002,2024-01-02 10:15:00,2.00,...,question,en,some,yes,lens_check,lens_evaluation,diagnosis,85,,YELLOW,Patient needs follow-up
```

---

## Data Flow - Complete Workflow

```
1. UPLOAD
   ┌─────────────────────────────────┐
   │  User uploads CSV               │
   │  (21 columns including 4 new)   │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  datasets.py                    │
   │  ✓ Validate columns             │
   │  ✓ Map old → new names          │
   │  ✓ Parse data                   │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Create LogRow records          │
   │  Store all 21 columns           │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  PostgreSQL (log_rows table)    │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Dataset appears on Dashboard   │
   └─────────────────────────────────┘

2. OPEN SPREADSHEET
   ┌─────────────────────────────────┐
   │  User clicks "Start Labeling"   │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  GET /spreadsheet/{id}/rows     │
   │  Fetch LogRow + Label           │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  SpreadsheetRow schema          │
   │  • CSV data (21 fields)         │
   │  • User labels (7 fields)       │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Display in Spreadsheet UI      │
   │  • Read-only: all CSV data      │
   │  • Editable: annotation fields  │
   └─────────────────────────────────┘

3. EDIT & SAVE
   ┌─────────────────────────────────┐
   │  User fills annotation columns  │
   │  (Step, Substep, Intent, etc.)  │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Click "Save All"               │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  POST /spreadsheet/{id}/save    │
   │  Send updated rows              │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Create/Update Label records    │
   │  Store annotations              │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Confirmation: "Saved!"         │
   └─────────────────────────────────┘

4. EXPORT
   ┌─────────────────────────────────┐
   │  User clicks "Export CSV"       │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  GET /spreadsheet/{id}/export   │
   │  • Join LogRow + Label          │
   │  • Combine all columns          │
   │  • Order: CSV data first, then  │
   │    user annotations             │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Stream CSV download            │
   │  (Complete labeled dataset)     │
   └────────────┬────────────────────┘
                ↓
   ┌─────────────────────────────────┐
   │  Save labeled_data_{id}.csv     │
   │  • Original CSV data (21 cols)  │
   │  • User annotations (7 cols)    │
   └─────────────────────────────────┘
```

---

## Key Changes Summary

```
BEFORE                              AFTER
─────────────────────────────────────────────────────────────
session_id                       ──> engagement_id
(no additional CSV columns)      ──> speaker_intent
                                 ──> detected_language
                                 ──> hesitation_markers
                                 ──> requires_verification

Spreadsheet showed only CSV      ──> Shows CSV data + 4 new
data + annotation fields             fields + annotation fields

Export had: CSV + annotations    ──> Export has: CSV + 4 new
(17 columns total)                   + annotations
                                      (28 columns total)
```

---

## Testing Checklist

- [x] Model structure validated
- [x] API schema validated
- [x] CSV parsing validated
- [x] Backward compatibility validated
- [x] Frontend component validated
- [ ] Full Docker integration test (pending Docker setup)
- [ ] Manual spreadsheet interaction (pending Docker setup)
- [ ] CSV upload & export (pending Docker setup)

---

**Status**: Ready for Docker testing and deployment
