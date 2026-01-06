# Autosave & Admin Dashboard Setup Guide

## What's New

### 1. **Autosave Every 5 Seconds** ✅
- Your labeling work is now automatically saved every 5 seconds
- No need to manually click save frequently
- "Last saved" timestamp displayed in the header
- Yellow warning added to the labeling guide

### 2. **Real-Time Progress Tracking** ✅
- Every save updates your progress in the database
- Tracks how many rows you've reviewed
- Records when you last saved
- Marks submission status

### 3. **Admin Dashboard** ✅
- New admin-only page at `/admin`
- Real-time view of all users working on datasets
- Shows:
  - Which datasets are being worked on
  - How many users are working on each dataset
  - Progress percentage for each user
  - Last saved time for each user
  - Submission status (In Progress or Submitted)
- Auto-refreshes every 5 seconds
- Manual refresh button available

## Setup Instructions

### Step 1: Update Supabase Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ebxxnjttexfykpgkkbbu`
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy and paste the contents of `update_schema.sql`
6. Click **Run** to execute the SQL

This will create the `user_progress` table and set up the necessary permissions.

### Step 2: Test the Features

#### Test Autosave:
1. Go to http://localhost:3001 or your Vercel URL
2. Login with your account
3. Click on any dataset to open the spreadsheet labeling view
4. Make some edits to the data
5. Wait 5 seconds and look at the "Last saved" timestamp in the header
6. It should update automatically

#### Test Admin Dashboard (Admin users only):
1. Login with admin account: `chirayu.maru@lenskart.com`
2. You should see a purple "Admin Dashboard" button in the main dashboard
3. Click it to open the admin dashboard at `/admin`
4. You'll see:
   - All datasets that have been worked on
   - Users working on each dataset
   - Progress bars showing completion percentage
   - Last saved timestamps
   - Submission status

#### Test Real-Time Updates:
1. Open two browser windows side by side
2. Login as admin in one window, go to `/admin`
3. Login as a regular user in another window
4. Have the regular user label some data
5. Watch the admin dashboard update in real-time (refreshes every 5 seconds)

## Features in Detail

### Autosave
- **Frequency**: Every 5 seconds
- **Trigger**: Only saves if there are unsaved changes
- **Indicator**: "Last saved: [time]" shown in header
- **Background**: Runs silently without interrupting your work
- **Warning**: Yellow box in labeling guide reminds users to save before leaving

### Progress Tracking
- **Automatic**: Updates every time you save (manual or autosave)
- **Tracks**:
  - Dataset ID
  - User ID and email
  - Number of rows reviewed
  - Last saved timestamp
  - Submission status
  - Submission timestamp
- **Visibility**: All authenticated users can see all progress (for admin dashboard)
- **Privacy**: Users can only update their own progress

### Admin Dashboard
- **Access**: Only users with `role: 'admin'` in their user metadata
- **Real-time**: Auto-refreshes every 5 seconds
- **Manual Refresh**: Button available in header
- **Displays**:
  - Dataset name and total rows
  - Number of users working on each dataset
  - Per-user progress with percentage and progress bar
  - Status badges (In Progress 🟡 or Submitted 🟢)
  - Timestamps for last save and submission
- **Empty States**: Shows messages when no datasets or users yet

## Admin User Setup

To make a user an admin:

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user you want to make admin
3. Click on their email to edit
4. Scroll to **User Metadata**
5. Add this JSON:
   ```json
   {
     "role": "admin"
   }
   ```
6. Click **Save**
7. The user will now see the "Admin Dashboard" button

## Troubleshooting

### Autosave not working?
- Check browser console for errors
- Verify you're logged in
- Ensure you have made changes (hasUnsavedChanges = true)

### Admin dashboard not visible?
- Verify user has `role: 'admin'` in user_metadata
- Refresh the page after setting the role
- Check browser console for errors

### Progress not showing?
- Ensure `update_schema.sql` was run successfully
- Check that `user_progress` table exists in Supabase
- Verify RLS policies are enabled

### Admin dashboard shows "auth.admin.getUserById is not a function"?
- This is expected - Supabase client doesn't have admin methods
- You need to use service role key for admin operations
- Alternative: Store user emails in the progress table

## Next Steps

1. Run `update_schema.sql` in Supabase SQL Editor
2. Set admin role for your user account
3. Test autosave by editing data
4. Test admin dashboard with multiple users
5. Deploy to production via Vercel (already auto-deployed)

## Files Modified

- `frontend/src/pages/SpreadsheetLabeling.tsx` - Added autosave logic
- `frontend/src/pages/AdminDashboard.tsx` - New admin dashboard page
- `frontend/src/pages/Dashboard.tsx` - Added admin button
- `frontend/src/App.tsx` - Added admin route
- `supabase_schema.sql` - Updated with user_progress table
- `update_schema.sql` - Standalone SQL for database update

All changes have been pushed to Git and will auto-deploy to Vercel!
