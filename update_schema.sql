-- Run this SQL in Supabase SQL Editor to add user progress tracking
-- This allows real-time tracking of user labeling progress

-- Create user_progress table to track labeling progress
CREATE TABLE IF NOT EXISTS user_progress (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    rows_reviewed INTEGER DEFAULT 0,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dataset_id, user_id)
);

-- Enable RLS for user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_progress table
-- Allow authenticated users to read all progress (for admin dashboard)
CREATE POLICY "Allow authenticated users to read progress"
ON user_progress FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert/update their own progress
CREATE POLICY "Allow users to manage own progress"
ON user_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update own progress"
ON user_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
