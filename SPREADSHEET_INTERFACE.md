# Spreadsheet Labeling Interface - Implementation Summary

## What Changed

I've completely redesigned the labeling interface from a **one-row-at-a-time** approach to an **Excel-like spreadsheet view** where users can see and edit all rows simultaneously.

## New Workflow

### 1. Upload CSV
- Upload your CSV file with columns like:
  - `Engagement_ID`, `timestamp`, `R_SPH`, `R_CYL`, `R_AXIS`, `R_ADD`
  - `L_SPH`, `L_CYL`, `L_AXIS`, `L_ADD`, `PD`, `Chart_Number`
  - `Occluder_State`, `Chart_Display`, `Speaker`, `Utterance_Text`
  - `Translation_in_En`, etc.

### 2. Click "Start Labeling"
- Opens the new spreadsheet interface
- Shows ALL rows at once

### 3. Spreadsheet Layout
**Read-Only Columns (Gray Background):**
- All data from your uploaded CSV
- Engagement_ID, timestamp, lens values, speaker, utterance, etc.

**Editable Columns (Green Background):**
- Step
- Substep
- Intent_of_Optum
- Confidence_of_Optum
- Patient_Confidence_Score
- Flag (dropdown: GREEN/YELLOW/RED)
- Reason_For_Flag

### 4. Save & Export
- **Save All**: Saves all your annotations to the database
- **Export CSV**: Downloads a CSV with both original data + your labels

## Technical Implementation

### Frontend
- **New Component**: `SpreadsheetLabeling.tsx`
  - Excel-like table with horizontal/vertical scrolling
  - Read-only cells for source data
  - Editable input fields for annotations
  - Sticky header row

### Backend
- **New API Router**: `spreadsheet.py`
  - `GET /spreadsheet/{dataset_id}/rows` - Fetch all rows
  - `POST /spreadsheet/{dataset_id}/save` - Save bulk labels
  - `GET /spreadsheet/{dataset_id}/export` - Export labeled CSV

### Key Features
1. **Bulk Editing**: Edit multiple rows without page navigation
2. **Visual Distinction**: Color-coded columns (gray=readonly, green=editable)
3. **Persistent State**: Your labels are saved per user
4. **CSV Export**: Download your work as a complete CSV file

## How to Use

1. **Login** (e.g., `admin@example.com` / `adminpassword`)
2. **Upload CSV** from Dashboard
3. **Click "Start Labeling"** on the dataset
4. **Fill in the green columns** for each row
5. **Click "Save All"** to persist your work
6. **Click "Export CSV"** to download the labeled data

## Notes
- The old one-row-at-a-time interface (`/labeling`) still exists but is no longer used
- Each user's labels are stored separately
- The spreadsheet shows your own labels when you return to it
- All rows are visible and editable at once - no pagination needed for small datasets
