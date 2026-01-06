-- Create Admin User in Supabase
-- Run this in your Supabase SQL Editor after running the main schema

-- Note: This creates the user in Supabase Auth
-- You can also just register through the UI at http://localhost:3001/register

-- To manually create a user in Supabase, you'll need to:
-- 1. Go to Authentication > Users in your Supabase Dashboard
-- 2. Click "Add User" 
-- 3. Enter:
--    Email: chirayu.maru@lenskart.com
--    Password: Daksh@2006
--    Email Confirm: Check this box to auto-confirm

-- OR you can use this SQL to insert directly (be careful with this approach):
-- Note: Password needs to be hashed. It's better to use the Dashboard method above.

-- Alternative: Add admin role metadata to existing user
-- First, register the user normally through the app, then run this:

-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'chirayu.maru@lenskart.com';
