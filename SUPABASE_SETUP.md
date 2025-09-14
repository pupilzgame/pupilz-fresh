# Supabase Leaderboard Setup Guide

The leaderboard is erasing because it's not properly connected to the Supabase database. Follow these steps to fix it:

## 🗄️ Step 1: Create Database Table

1. Go to your **Supabase Dashboard** (https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** in the sidebar
4. Copy and paste the SQL from `supabase-setup.sql`
5. Click **Run** to create the table

## 🔧 Step 2: Configure Environment Variables

### Option A: Automatic (Recommended)
1. Go to **Vercel Dashboard** → Your Project → Settings → Integrations
2. Make sure **Supabase** integration is properly connected
3. The environment variables should be set automatically

### Option B: Manual Setup
If automatic setup isn't working:

1. Go to **Supabase Dashboard** → Settings → API
2. Copy your **Project URL** and **Anon Public Key**
3. Go to **Vercel Dashboard** → Your Project → Settings → Environment Variables
4. Add these variables:
   - `SUPABASE_URL` = your project URL (e.g., `https://xyz.supabase.co`)
   - `SUPABASE_ANON_KEY` = your anon public key

## 🧪 Step 3: Test the Setup

1. Deploy your app (it should auto-deploy when you push to GitHub)
2. Play the game and get a high score
3. Check if the score persists after closing and reopening the mini app
4. Check **Supabase Dashboard** → Table Editor → `leaderboard` to see stored scores

## 🔍 Step 4: Debug if Still Not Working

If scores still don't persist:

1. Open browser developer tools in the mini app
2. Go to **Network** tab
3. Play and get a high score
4. Look for API calls to `/api/leaderboard`
5. Check if they return errors

## 📊 Expected Result

Once properly configured:
- ✅ Scores persist globally across all users
- ✅ Leaderboard shows top 10 scores from everyone
- ✅ Real-time updates when new high scores are achieved
- ✅ Telegram username integration works automatically

## ⚠️ Common Issues

1. **Environment variables not set**: Scores won't save at all
2. **Database table doesn't exist**: API returns errors
3. **Supabase integration disconnected**: Variables missing in Vercel
4. **RLS policies wrong**: Database rejects write operations

Run the SQL script first, then verify environment variables are set in Vercel!