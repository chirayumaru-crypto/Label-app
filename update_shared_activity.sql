-- Simple activity tracking without user isolation
-- Run this in Supabase SQL Editor

-- Step 1: Ensure updated_by column exists in spreadsheet_data
ALTER TABLE spreadsheet_data 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Step 2: Create user_activity table (if not exists)
CREATE TABLE IF NOT EXISTS user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, dataset_id)
);

-- Step 3: Enable RLS for user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies for user_activity
DROP POLICY IF EXISTS "Allow users to read all activity" ON user_activity;
DROP POLICY IF EXISTS "Allow users to manage own activity" ON user_activity;
DROP POLICY IF EXISTS "Allow users to update own activity" ON user_activity;

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

-- Step 5: Ensure spreadsheet_data policies allow all users to access shared data
DROP POLICY IF EXISTS "Allow users to read own spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow users to insert own spreadsheet_data" ON spreadsheet_data;
DROP POLICY IF EXISTS "Allow users to update own spreadsheet_data" ON spreadsheet_data;

CREATE POLICY "Allow authenticated users to read spreadsheet_data"
ON spreadsheet_data FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert spreadsheet_data"
ON spreadsheet_data FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update spreadsheet_data"
ON spreadsheet_data FOR UPDATE
TO authenticated
USING (true);

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_spreadsheet_updated_by ON spreadsheet_data(updated_by);
CREATE INDEX IF NOT EXISTS idx_user_activity_dataset ON user_activity(dataset_id, is_active, last_activity);
