# Google Login Setup - Quick Start Guide

## ✅ What's Been Done

I've successfully implemented Google OAuth login for your movie booking system! Here's what was added:

### Backend Changes:
1. ✅ Added `google-auth` and `google-auth-oauthlib` to requirements.txt
2. ✅ Installed the packages in your virtual environment  
3. ✅ Added `/auth/google` endpoint in `server_main.py`
4. ✅ Updated `Database.create_user()` to support Google users (password optional)
5. ✅ Added `Database.get_user_by_email()` method for Google OAuth flow

### Frontend Changes:
1. ✅ Added Google Sign-In script to `index.html`
2. ✅ Updated `Login.jsx` with Google Sign-In button
3. ✅ Added "Or continue with" divider
4. ✅ Implemented `handleGoogleResponse()` function
5. ✅ Added `useEffect` to initialize Google Sign-In

## 🔧 Setup Steps (Required!)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application**
6. Add these to **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   http://localhost:5174
   http://127.0.0.1:5173
   http://127.0.0.1:5174
   ```
7. Add these to **Authorized redirect URIs**:
   ```
   http://localhost:5173
   http://localhost:5174
   ```
8. Click **Create** and copy your **Client ID**

### Step 2: Configure the Application

#### Backend Configuration:
Open `backend/server_main.py` and find line 246:
```python
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID")
```

Replace with your actual Client ID:
```python
GOOGLE_CLIENT_ID = "123456789-abc123xyz.apps.googleusercontent.com"
```

Or set as environment variable:
```bash
export GOOGLE_CLIENT_ID="123456789-abc123xyz.apps.googleusercontent.com"
```

#### Frontend Configuration:
Open `frontend/src/pages/Login.jsx` and find line 7:
```javascript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
```

Replace with your actual Client ID:
```javascript
const GOOGLE_CLIENT_ID = '123456789-abc123xyz.apps.googleusercontent.com'
```

### Step 3: Start the Servers

#### Backend:
```bash
cd backend
source .venv/bin/activate
uvicorn server_main:app --reload --host 127.0.0.1 --port 8000
```

#### Frontend:
```bash
cd frontend
npm run dev
```

### Step 4: Test Google Login

1. Open your browser to `http://localhost:5173/#/login` (or whichever port Vite is using)
2. You should see:
   - Regular email/password login form
   - "Or continue with" divider
   - Google Sign-In button
3. Click the Google button
4. Sign in with your Google account
5. You'll be redirected to the home page as a logged-in user!

## 🎉 How It Works

1. **User clicks Google button** → Google OAuth popup appears
2. **User signs in with Google** → Google returns a JWT token
3. **Frontend sends token to `/auth/google`** → Backend verifies with Google
4. **Backend extracts email & name** → Checks if user exists in database
5. **If new user** → Creates account automatically
6. **If existing user** → Returns user info
7. **Frontend saves to localStorage** → Redirects to home page

## 🔒 Security

- Google Client ID can be public (it's designed for frontend use)
- Token verification happens on backend (secure)
- Google users don't have passwords in your database (they can only login via Google)
- Original email/password login still works for existing users

## 📝 Files Modified

**Backend:**
- `requirements.txt` - Added Google OAuth libs
- `server_main.py` - Added imports, GoogleAuthRequest model, `/auth/google` endpoint
- `database/db.py` - Updated `create_user()` and added `get_user_by_email()`

**Frontend:**
- `index.html` - Added Google GSI script
- `src/pages/Login.jsx` - Added Google Sign-In button and handler

## 🐛 Troubleshooting

**Google button doesn't appear:**
- Check browser console for errors
- Make sure Google Client ID is set correctly
- Verify the Google script is loaded in index.html

**"Invalid token" error:**
- Double-check Client IDs match in frontend and backend
- Verify domains are authorized in Google Cloud Console
- Make sure you're using the same Google Cloud project

**Database error:**
- Run `POST /init` endpoint to initialize database
- Check that backend server is running

## 📧 Test Accounts

Regular login still works:
- Admin: `admin@gmail.com` / `admin`
- Demo: `demo@gmail.com` / `demo`

Google login works with any Google account!

---

Need more help? Check the detailed guide in `GOOGLE_AUTH_SETUP.md`
