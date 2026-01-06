-- Update schema for user-specific dataset isolation
-- Run this in Supabase SQL Editor

-- Add user_id to spreadsheet_data table to track which user owns each row
ALTER TABLE spreadsheet_data 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for spreadsheet_data
DROP POLICY IF EXISTS "Allow authenticated users to read spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow authenticated users to insert spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow authenticated users to update spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow authenticated users to delete spreadsheet_data" ON spreadsheet_data;

-- Users can read their own data or master data (user_id is null)
CREATE POLICY "Users read own or master data"
ON spreadsheet_data FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can insert their own data
CREATE POLICY "Users insert own data"
ON spreadsheet_data FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can update their own data
CREATE POLICY "Users update own data"
ON spreadsheet_data FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own data  
CREATE POLICY "Users delete own data"
ON spreadsheet_data FOR DELETE
TO authenticated
USING (user_id = auth.uid());
