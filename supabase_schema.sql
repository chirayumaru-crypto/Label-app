-- Label App Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    total_rows INTEGER DEFAULT 0,
    labeled_count INTEGER DEFAULT 0
);

-- Create images table
CREATE TABLE IF NOT EXISTS images (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    labeled_at TIMESTAMP WITH TIME ZONE,
    labeled_by UUID REFERENCES auth.users(id)
);

-- Create spreadsheet_data table
CREATE TABLE IF NOT EXISTS spreadsheet_data (
    id BIGSERIAL PRIMARY KEY,
    dataset_id BIGINT REFERENCES datasets(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create storage bucket for datasets
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_data ENABLE ROW LEVEL SECURITY;

-- Policies for datasets table
-- Allow authenticated users to read all datasets
CREATE POLICY "Allow authenticated users to read datasets"
ON datasets FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert datasets
CREATE POLICY "Allow authenticated users to insert datasets"
ON datasets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own datasets
CREATE POLICY "Allow users to update own datasets"
ON datasets FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Allow users to delete their own datasets
CREATE POLICY "Allow users to delete own datasets"
ON datasets FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Policies for images table
-- Allow authenticated users to read all images
CREATE POLICY "Allow authenticated users to read images"
ON images FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert images
CREATE POLICY "Allow authenticated users to insert images"
ON images FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update images
CREATE POLICY "Allow authenticated users to update images"
ON images FOR UPDATE
TO authenticated
USING (true);

-- Policies for spreadsheet_data table
-- Allow authenticated users to read all spreadsheet data
CREATE POLICY "Allow authenticated users to read spreadsheet_data"
ON spreadsheet_data FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert spreadsheet data
CREATE POLICY "Allow authenticated users to insert spreadsheet_data"
ON spreadsheet_data FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update spreadsheet data
CREATE POLICY "Allow authenticated users to update spreadsheet_data"
ON spreadsheet_data FOR UPDATE
TO authenticated
USING (true);

-- Storage policies
-- Allow authenticated users to upload to datasets bucket
CREATE POLICY "Allow authenticated users to upload datasets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'datasets');

-- Allow public to read from datasets bucket
CREATE POLICY "Allow public to read datasets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'datasets');
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
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_dataset_id ON images(dataset_id);
CREATE INDEX IF NOT EXISTS idx_images_label ON images(label);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_dataset_id ON spreadsheet_data(dataset_id);

-- Function to update labeled_count in datasets
CREATE OR REPLACE FUNCTION update_dataset_labeled_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE datasets
    SET labeled_count = (
        SELECT COUNT(*) 
        FROM images 
        WHERE dataset_id = NEW.dataset_id AND label IS NOT NULL
    )
    WHERE id = NEW.dataset_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update labeled_count when an image is labeled
CREATE TRIGGER trigger_update_labeled_count
AFTER UPDATE OF label ON images
FOR EACH ROW
WHEN (OLD.label IS DISTINCT FROM NEW.label)
EXECUTE FUNCTION update_dataset_labeled_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at in spreadsheet_data
CREATE TRIGGER trigger_update_spreadsheet_updated_at
BEFORE UPDATE ON spreadsheet_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
