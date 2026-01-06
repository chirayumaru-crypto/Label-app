# User Isolation Implementation Guide

## Overview
This implementation adds per-user data isolation so each user can work on their own copy of a dataset, and admins can track and view individual user contributions.

## How It Works

### Master Data Template
- When admin uploads a CSV, it's stored in `spreadsheet_data` with `user_id = NULL`
- This master copy serves as the template for all users

### User-Specific Copies
- When a user first opens a dataset, the system:
  1. Checks if they have existing data (`user_id = their_id`)
  2. If not, copies the master data and assigns it to them
  3. User works on their own isolated copy

### Admin Capabilities
- View all users' progress in Admin Dashboard (`/admin`)
- **View** button: Opens read-only spreadsheet view of user's work
- **Download** button: Downloads user's labeled data as CSV

## Implementation Steps

### ✅ Step 1: Code Changes (COMPLETED)
All code files have been updated:
- ✅ `frontend/src/services/api.ts` - User-specific data fetching/saving
- ✅ `frontend/src/pages/Dashboard.tsx` - Master data upload
- ✅ `frontend/src/pages/AdminDashboard.tsx` - View/Download buttons
- ✅ `frontend/src/pages/SpreadsheetLabeling.tsx` - Read-only viewing mode

### 📋 Step 2: Database Migration (REQUIRED)
You must run the SQL migration to add `user_id` column:

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy the contents of `update_schema_user_isolation.sql`
5. Paste and **Run** the script
6. Verify success (should see "Success" message)

### 🧪 Step 3: Testing

#### Test Upload (Admin)
1. Login as admin: `chirayu.maru@lenskart.com`
2. Go to Dashboard
3. Upload a new CSV dataset
4. Verify upload completes successfully

#### Test User Isolation
1. Open dataset in SpreadsheetLabeling view
2. Make some edits, let autosave complete
3. Logout and login as different user
4. Open same dataset
5. Verify you see fresh copy (not other user's edits)
6. Make different edits
7. Logout and login as first user
8. Verify you see your original edits (not second user's)

#### Test Admin Dashboard
1. Login as admin
2. Navigate to `/admin` route
3. Verify you see list of users with progress
4. Click **View** (👁️) button for a user
   - Should open spreadsheet in read-only mode
   - Header shows "Viewing [user's] Work (Read-Only)"
   - Input fields are disabled/readonly
   - No Save/Export buttons visible
5. Go back to admin dashboard
6. Click **Download** (⬇️) button for a user
   - Should download CSV named `dataset-name_username.csv`
   - CSV contains only that user's labeled data

### 🔧 Step 4: Verification Checklist

- [ ] Migration script ran successfully
- [ ] No errors in browser console
- [ ] Each user sees only their own data
- [ ] Autosave still works (5 second interval)
- [ ] Cell highlighting still works (yellow/blue)
- [ ] Admin can view all users' progress
- [ ] View button shows read-only spreadsheet
- [ ] Download button exports user-specific CSV
- [ ] Master data export still works (admin export all)

## Key Features Preserved

All existing functionality remains intact:
- ✅ Autosave every 5 seconds
- ✅ Cell change highlighting (yellow)
- ✅ Default row highlighting (blue)
- ✅ Workflow steps (3, 4, 5)
- ✅ Image viewing
- ✅ Progress tracking
- ✅ CSV export (now with user filtering)
- ✅ Duplicate row removal on upload
- ✅ Row number display

## Architecture Changes

### Database Schema
```sql
spreadsheet_data (
  id UUID PRIMARY KEY,
  dataset_id UUID REFERENCES datasets(id),
  data JSONB,
  user_id UUID REFERENCES auth.users(id),  -- NEW COLUMN
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Master data: user_id = NULL
-- User data: user_id = specific user's UUID
```

### API Functions Updated

#### `getSpreadsheetData(datasetId, userId?)`
- If viewing specific user: returns their data
- If user has no data yet: copies from master (user_id=NULL)
- Returns empty array if no master data exists

#### `saveSpreadsheetData(datasetId, data)`
- Deletes user's existing data for dataset
- Inserts new records with current user's ID
- Atomic operation (delete + insert in transaction)

#### `exportDataset(datasetId, format, userId?)`
- If userId provided: exports only that user's data
- If no userId: exports all labeled data (all users combined)
- Admin export functionality preserved

### UI Components Updated

#### AdminDashboard
- Shows user email, dataset name, rows reviewed
- View button: `<Eye size={16} />` navigates to read-only view
- Download button: `<Download size={16} />` exports user's CSV
- Filename format: `datasetname_username.csv`

#### SpreadsheetLabeling
- Detects URL params: `?userId=XXX&viewOnly=true`
- When in view-only mode:
  - Header shows: "Viewing [user's] Work (Read-Only)"
  - All inputs have `readOnly={true}` or `disabled={true}`
  - Save/Export buttons hidden
  - Loads specified user's data instead of current user

## Troubleshooting

### Issue: "user_id column does not exist"
**Solution**: Run the migration script in Supabase SQL Editor

### Issue: Users see other users' data
**Solution**: Check RLS policies are correctly applied. Re-run migration script.

### Issue: View button shows blank page
**Solution**: 
1. Check browser console for errors
2. Verify user_id is valid UUID
3. Ensure user has labeled data for that dataset

### Issue: Download returns empty CSV
**Solution**: 
1. Verify user has saved data (not just viewed)
2. Check user_id matches in database
3. Test with admin export (no userId) to verify dataset has data

## Security Notes

- RLS policies ensure users can only access their own data
- Master data (user_id=NULL) is read-only for regular users
- Admin users can bypass RLS to view all data
- Read-only mode is enforced in UI (inputs disabled)

## Next Steps

1. **Deploy Frontend**: Changes auto-deploy to Vercel at https://label-lk.vercel.app
2. **Run Migration**: Execute SQL script in Supabase
3. **Test End-to-End**: Follow testing steps above
4. **Train Users**: Explain each user gets their own copy
5. **Monitor**: Check Admin Dashboard regularly for progress

## Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify migration script completed successfully
4. Test with fresh dataset upload
5. Ensure users are logging in with correct credentials

---

**Status**: Code complete ✅ | Migration pending 📋 | Testing pending 🧪
