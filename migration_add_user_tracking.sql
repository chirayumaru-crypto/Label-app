-- Migration: Add user tracking columns to spreadsheet_data table
-- Run this in Supabase SQL Editor

-- Add user_id and user_email columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'spreadsheet_data' AND column_name = 'user_id') THEN
        ALTER TABLE spreadsheet_data 
        ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'spreadsheet_data' AND column_name = 'user_email') THEN
        ALTER TABLE spreadsheet_data 
        ADD COLUMN user_email TEXT;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_spreadsheet_data_user_id ON spreadsheet_data(user_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_data_dataset_user ON spreadsheet_data(dataset_id, user_id);

-- Update RLS policies for spreadsheet_data to allow user-specific access
DROP POLICY IF EXISTS "Allow users to insert their own data" ON spreadsheet_data;
CREATE POLICY "Allow users to insert their own data"
    ON spreadsheet_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to view all data in datasets they have access to" ON spreadsheet_data;
CREATE POLICY "Allow users to view all data in datasets they have access to"
    ON spreadsheet_data
    FOR SELECT
    USING (true);  -- All authenticated users can view

DROP POLICY IF EXISTS "Allow users to update their own data" ON spreadsheet_data;
CREATE POLICY "Allow users to update their own data"
    ON spreadsheet_data
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own data" ON spreadsheet_data;
CREATE POLICY "Allow users to delete their own data"
    ON spreadsheet_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- Comment
COMMENT ON COLUMN spreadsheet_data.user_id IS 'User who created/labeled this data';
COMMENT ON COLUMN spreadsheet_data.user_email IS 'Email of user who created/labeled this data';
