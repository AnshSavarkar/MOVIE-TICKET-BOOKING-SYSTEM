# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your Movie Booking application.

## Prerequisites
- A Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "MovieBook Auth")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: MovieBook
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On Scopes page, click "Save and Continue"
7. On Test users page (optional), add test users if needed
8. Click "Save and Continue"
9. Review and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Choose **"Web application"**
5. Configure:
   - **Name**: MovieBook Web Client
   - **Authorized JavaScript origins**: Add these URLs:
     - `http://localhost:5173` (for development)
     - `http://127.0.0.1:5173` (for development)
     - Add your production domain when ready
   - **Authorized redirect URIs**: Add these URLs:
     - `http://localhost:5173` (for development)
     - `http://127.0.0.1:5173` (for development)
     - Add your production domain when ready
6. Click **"Create"**
7. **IMPORTANT**: Copy your **Client ID** - you'll need this!

## Step 5: Configure Backend

1. Open a terminal in the backend directory:
   ```bash
   cd backend
   source .venv/bin/activate  # or your virtual environment
   pip install -r requirements.txt  # This will install google-auth libraries
   ```

2. Set your Google Client ID as an environment variable:
   ```bash
   # On macOS/Linux:
   export GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
   
   # Or add to your shell profile (~/.zshrc or ~/.bash_profile):
   echo 'export GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. Alternatively, you can hardcode it in `server_main.py` (line ~140):
   ```python
   GOOGLE_CLIENT_ID = 'your-client-id-here.apps.googleusercontent.com'
   ```

## Step 6: Configure Frontend

1. Open `frontend/src/pages/Login.jsx`
2. Find line 6 and replace with your Client ID:
   ```javascript
   const GOOGLE_CLIENT_ID = 'your-client-id-here.apps.googleusercontent.com'
   ```

## Step 7: Test the Integration

1. Start the backend server:
   ```bash
   cd backend
   source .venv/bin/activate
   uvicorn server_main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. Start the frontend dev server:
   ```bash
   cd frontend
   npm install  # if not already done
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`
4. Navigate to the login page
5. You should see a Google Sign-In button
6. Click it and sign in with your Google account

## Troubleshooting

### "Invalid Client ID" Error
- Make sure you copied the entire Client ID correctly
- Verify the Client ID in both frontend and backend matches your Google Console credentials

### "Redirect URI Mismatch" Error
- Make sure `http://localhost:5173` and `http://127.0.0.1:5173` are added to Authorized JavaScript origins in Google Console
- Clear browser cache and try again

### Google Button Not Showing
- Check browser console for errors
- Make sure the Google Sign-In script is loaded in `index.html`
- Verify your Client ID is set correctly in Login.jsx

### Backend Authentication Fails
- Check that google-auth libraries are installed: `pip list | grep google-auth`
- Verify the GOOGLE_CLIENT_ID environment variable is set
- Check backend logs for detailed error messages

## Security Notes

- **Never commit** your Client ID or Client Secret to version control if using a public repository
- Use environment variables for production deployments
- Consider adding your Client ID to `.env` files (and add `.env` to `.gitignore`)
- For production, make sure to add your production domain to Authorized origins in Google Console

## Production Deployment

When deploying to production:

1. Update Authorized JavaScript origins in Google Console with your production domain
2. Set GOOGLE_CLIENT_ID as an environment variable on your server
3. Update the GOOGLE_CLIENT_ID in your frontend build process
4. Consider using a proper secrets management service (AWS Secrets Manager, Azure Key Vault, etc.)

## Need Help?

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sign-In for Websites](https://developers.google.com/identity/gsi/web)
