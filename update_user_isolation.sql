-- Update spreadsheet_data table to add user_id for user isolation
-- Run this in Supabase SQL Editor

-- Step 1: Add user_id column
ALTER TABLE spreadsheet_data 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Create unique constraint (drop if exists first)
ALTER TABLE spreadsheet_data 
DROP CONSTRAINT IF EXISTS spreadsheet_data_dataset_id_user_id_data_id_key;

-- Note: The constraint on JSONB needs to be created carefully
-- You might need to create it via code when inserting data

-- Step 3: Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, dataset_id)
);

-- Step 4: Enable RLS for user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Step 5: Update RLS policies for spreadsheet_data
DROP POLICY IF EXISTS "Allow authenticated users to read spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow authenticated users to insert spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow authenticated users to update spreadsheet_data" ON spreadsheet_data;

-- New policies for user-specific data
CREATE POLICY "Allow users to read own spreadsheet_data"
ON spreadsheet_data FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow users to insert own spreadsheet_data"
ON spreadsheet_data FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow users to update own spreadsheet_data"
ON spreadsheet_data FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Step 6: Create policies for user_activity
CREATE POLICY "Allow users to read all activity"
ON user_activity FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to manage own activity"
ON user_activity FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update own activity"
ON user_activity FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_spreadsheet_user_id ON spreadsheet_data(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_dataset ON user_activity(dataset_id, is_active, last_activity);
