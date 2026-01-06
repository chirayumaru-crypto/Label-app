# Fix Supabase Email Redirect to Production URL

## Problem
Email confirmation links are redirecting to `localhost:3000` instead of `https://label-lk.vercel.app`

## Solution

### Step 1: Update Supabase Redirect URLs

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ebxxnjttexfykpgkkbbu`
3. Navigate to **Authentication** → **URL Configuration** (in the left sidebar)
4. Update the following settings:

#### Site URL
```
https://label-lk.vercel.app
```

#### Redirect URLs (Add both)
```
https://label-lk.vercel.app/**
https://label-lk.vercel.app/login
http://localhost:3001/login
http://localhost:3000/login
```

5. Click **Save**

### Step 2: Verify Email Template (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup**
3. Make sure the template uses `{{ .ConfirmationURL }}` variable
4. The default template should work, but verify it looks like:
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

### Step 3: Test

1. Try registering a new user from production: https://label-lk.vercel.app/register
2. Check the email - the confirmation link should now point to `https://label-lk.vercel.app/login`
3. If testing locally, the link should point to `http://localhost:3001/login`

### Why This Happens

Supabase uses the **Site URL** setting as the default redirect URL for email confirmations. If this is set to `localhost`, all email links will use that URL regardless of where the signup request came from.

### Additional Notes

- The code already handles this correctly with `import.meta.env.PROD`
- In production, it uses: `https://label-lk.vercel.app/login`
- In development, it uses: `window.location.origin + '/login'`
- But Supabase must also be configured to allow these URLs

### Troubleshooting

If it still doesn't work:
1. Clear Supabase cache by saving the URL configuration again
2. Wait 1-2 minutes for changes to propagate
3. Try registering with a different email address
4. Check Supabase logs: **Authentication** → **Logs**
