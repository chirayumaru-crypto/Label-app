# Email Configuration Guide for Supabase

## Issue Fixed:
1. ✅ **Dataset Upload RLS Error** - Fixed by adding `created_by` field to dataset creation
2. ✅ **Email Confirmation** - Updated registration to handle email confirmation properly

## Email Configuration in Supabase

### Option 1: Disable Email Confirmation (Quick - For Testing)

1. Go to your Supabase Dashboard: https://ebxxnjttexfykpgkkbbu.supabase.co
2. Navigate to **Authentication** → **Providers** → **Email**
3. Scroll down to **"Confirm email"**
4. **Uncheck** "Enable email confirmations"
5. Click **Save**

Now users can register and login immediately without email confirmation.

### Option 2: Configure Email (Production Setup)

#### Using Supabase's Default Email (Limited):
Supabase provides limited email sending for free tier. This is already configured by default.

#### Using Custom SMTP (Recommended for Production):

1. Go to **Authentication** → **Settings** → **SMTP Settings**

2. **Enable Custom SMTP**

3. Configure your SMTP provider (examples below):

**Gmail:**
```
Sender email: your-email@gmail.com
Sender name: Your App Name
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: Your App Password (not regular password!)
```
Note: You need to enable "App Passwords" in your Google Account settings.

**SendGrid:**
```
Sender email: verified-email@yourdomain.com
Sender name: Your App Name
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: Your SendGrid API Key
```

**AWS SES:**
```
Sender email: verified-email@yourdomain.com
Sender name: Your App Name
Host: email-smtp.region.amazonaws.com
Port: 587
Username: Your SMTP Username
Password: Your SMTP Password
```

4. Click **Save**

5. Test by registering a new user

### URL Configuration

Go to **Authentication** → **URL Configuration** and set:

**Site URL:**
```
Production: https://your-app.vercel.app
Development: http://localhost:3001
```

**Redirect URLs:**
```
https://your-app.vercel.app/**
http://localhost:3001/**
```

## What Was Fixed in Code:

### 1. Dataset Creation (RLS Policy Fix)
**Before:**
```typescript
export const createDataset = async (name: string) => {
    return supabase.from('datasets').insert([{ name }]);
};
```

**After:**
```typescript
export const createDataset = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    return supabase.from('datasets').insert([{ 
        name,
        created_by: user.id  // This was missing!
    }]).select();
};
```

### 2. Email Confirmation Handling
- Added email redirect URL to registration
- Added success message display for email confirmation
- Better error handling for registration flow

## Testing:

### Test Dataset Upload:
1. Login at http://localhost:3001/login
2. Go to Dashboard
3. Try uploading your CSV file
4. Should work now without RLS error! ✅

### Test Email Registration:
1. Go to http://localhost:3001/register
2. Register with a new email
3. If email confirmation is **enabled**: Check your email for confirmation link
4. If email confirmation is **disabled**: You can login immediately

## Troubleshooting:

**Not receiving emails?**
- Check Supabase logs: Authentication → Logs
- Verify SMTP settings
- Check spam folder
- Try disabling email confirmation for testing

**Still getting RLS error?**
- Make sure you're logged in
- Check browser console for errors
- Verify the user has a valid session

## Current Status:
✅ Dataset upload RLS error - FIXED
✅ Email confirmation handling - FIXED
⏳ Email delivery - Depends on your Supabase email configuration
