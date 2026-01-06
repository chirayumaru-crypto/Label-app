# Label App - Supabase Migration Guide

## Overview
The backend has been migrated from Python/FastAPI to Supabase. This guide will help you complete the setup.

## What's Been Done

### ✅ Completed
1. Removed the old Python backend directory
2. Removed `docker-compose.yml` and `render.yaml`
3. Installed `@supabase/supabase-js` in frontend
4. Created Supabase client configuration
5. Updated all frontend pages to use Supabase:
   - Login.tsx
   - Register.tsx
   - Dashboard.tsx
   - Labeling.tsx
   - SpreadsheetLabeling.tsx
6. Created new API service layer for Supabase
7. Created `.env` file with your Supabase credentials
8. Created database schema SQL file

## Setup Instructions

### Step 1: Set Up Database Schema
1. Go to your Supabase project: https://ebxxnjttexfykpgkkbbu.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Copy the contents of `supabase_schema.sql` (located in the root directory)
4. Paste it into the SQL Editor
5. Click **Run** to execute the SQL

This will create:
- `datasets` table
- `images` table
- `spreadsheet_data` table
- Storage bucket for file uploads
- Row Level Security (RLS) policies
- Indexes and triggers

### Step 2: Configure Authentication
1. In your Supabase dashboard, go to **Authentication** > **Settings**
2. Configure email settings:
   - Enable email confirmations (or disable for testing)
   - Set up SMTP settings if needed
3. Under **URL Configuration**, add your frontend URL (e.g., `http://localhost:5173`)

### Step 3: Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Database Schema

### Tables

#### `datasets`
- `id`: Primary key
- `name`: Dataset name
- `created_at`: Creation timestamp
- `created_by`: User ID who created it
- `total_rows`: Total number of rows
- `labeled_count`: Number of labeled items

#### `images`
- `id`: Primary key
- `dataset_id`: Foreign key to datasets
- `url`: Image URL
- `label`: Label text (nullable)
- `created_at`: Creation timestamp
- `labeled_at`: Labeling timestamp
- `labeled_by`: User ID who labeled it

#### `spreadsheet_data`
- `id`: Primary key
- `dataset_id`: Foreign key to datasets
- `data`: JSONB field containing row data
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## API Functions

The following functions are available in `frontend/src/services/api.ts`:

### Authentication
- `signUp(credentials)` - Register new user
- `signIn(credentials)` - Login user
- `signOut()` - Logout user

### Datasets
- `getDatasets()` - Get all datasets
- `createDataset(name)` - Create new dataset
- `deleteDataset(datasetId)` - Delete dataset

### Images
- `getImages(datasetId, page, limit)` - Get images with pagination
- `getNextImage(datasetId, currentImageId)` - Get next unlabeled image
- `saveLabel(imageId, label)` - Save label for image

### Spreadsheet
- `getSpreadsheetData(datasetId)` - Get spreadsheet data
- `saveSpreadsheetData(datasetId, data)` - Save spreadsheet data

### Export
- `exportDataset(datasetId, format)` - Export dataset as CSV or JSON

## Environment Variables

The `.env` file in the `frontend` directory contains:
```
VITE_SUPABASE_URL=https://ebxxnjttexfykpgkkbbu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Key Differences from Old Backend

### Authentication
- **Old**: JWT tokens stored in localStorage
- **New**: Supabase handles authentication automatically with sessions

### File Upload
- **Old**: Files uploaded to backend server
- **New**: Files uploaded to Supabase Storage bucket

### Database
- **Old**: PostgreSQL with Alembic migrations
- **New**: Supabase PostgreSQL with RLS policies

### API Calls
- **Old**: Axios with REST endpoints
- **New**: Supabase client with direct database queries

## Testing

1. **Register a new user** at `/register`
2. **Login** at `/login`
3. **Upload a dataset** from the dashboard
4. **Label images** or use spreadsheet labeling
5. **Export results** as CSV

## Troubleshooting

### Authentication Issues
- Check if email confirmation is required in Supabase settings
- Verify the redirect URL is configured correctly

### Database Errors
- Ensure the schema SQL was executed successfully
- Check RLS policies are enabled

### Upload Issues
- Verify the storage bucket was created
- Check storage policies allow uploads

### CORS Errors
- Add your frontend URL to allowed origins in Supabase settings
- Go to **Settings** > **API** > **URL Configuration**

## Next Steps

1. Run the schema SQL in Supabase
2. Test authentication flow
3. Test dataset upload and labeling
4. Configure email templates if needed
5. Set up custom domain (optional)

## Support

For Supabase-specific issues, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)

## Notes

- The old backend has been completely removed
- All data will now be stored in Supabase
- User roles can be managed through Supabase Auth metadata
- File uploads now go to Supabase Storage instead of a backend server
