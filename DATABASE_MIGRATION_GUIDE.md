# Database Migration Required

## What Changed

The app now tracks which user labeled each dataset row and displays this information in the "View Labeled Data" page.

## Migration Steps

### 1. Run the SQL Migration

1. Go to your Supabase Dashboard: https://ebxxnjttexfykpgkkbbu.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `migration_add_user_tracking.sql`
5. Click **Run** or press `Ctrl+Enter`

### 2. Verify the Migration

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'spreadsheet_data' 
AND column_name IN ('user_id', 'user_email');
```

You should see both columns listed.

## What This Enables

✅ **User Tracking**: Each labeled dataset is associated with the user who labeled it
✅ **Multi-User Support**: Multiple users can label the same dataset independently
✅ **Email Display**: View Labeled Data page shows which user (email) labeled each row
✅ **Per-User Data**: Users only modify their own labeled data, not others'

## New Features

### In SpreadsheetLabeling:
- When user saves data, it's saved with their user_id and email
- Each user maintains their own version of labeled data

### In ViewLabels:
- Shows all columns in spreadsheet format (like the image you shared)
- Displays user email who labeled each row
- Blue-highlighted columns for labeled fields (Step, Substep, etc.)
- All original data columns visible (R_SPH, R_CYL, L_SPH, etc.)

## Testing

After running the migration:

1. Register/Login as a user
2. Go to a dataset and label some rows
3. Click "Save All"
4. Go to "View Labeled Data" 
5. You should see:
   - Your email in the "User" column
   - All spreadsheet columns displayed
   - Color-coded rows based on flags
   - Complete data in spreadsheet format

## Rollback (if needed)

If you need to rollback this migration:

```sql
ALTER TABLE spreadsheet_data DROP COLUMN IF EXISTS user_id;
ALTER TABLE spreadsheet_data DROP COLUMN IF EXISTS user_email;
DROP INDEX IF EXISTS idx_spreadsheet_data_user_id;
DROP INDEX IF EXISTS idx_spreadsheet_data_dataset_user;
```
