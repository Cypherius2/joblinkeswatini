# Google OAuth Setup Guide for JobLinkEswatini

## Overview
This guide will help you set up Google OAuth authentication for both login and registration in your JobLinkEswatini application.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter project name: "JobLinkEswatini" (or your preferred name)
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" and enable it
3. Also search for "Google Identity" and enable "Google Identity Services API"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in required fields:
     - App name: "JobLinkEswatini"
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue

4. For OAuth client ID:
   - Application type: "Web application"
   - Name: "JobLinkEswatini Web Client"
   - Authorized origins:
     - `http://localhost:8000` (for local development)
     - `http://127.0.0.1:8000`
     - Add your production domain when deploying
   - Authorized redirect URIs:
     - `http://localhost:8000/pages/login.html`
     - `http://localhost:8000/pages/signup.html`
     - Add production URLs when deploying

5. Click "Create"
6. Copy the "Client ID" (you'll need this)

## Step 4: Configure Your Application

1. **Backend Configuration:**
   - Copy your `.env.example` to `.env` in the backend folder
   - Add your Google Client ID to the `.env` file:
     ```
     GOOGLE_CLIENT_ID=your_actual_google_client_id_here
     ```

2. **Frontend Configuration:**
   - Open `js/config.js`
   - Replace `YOUR_GOOGLE_CLIENT_ID_HERE` with your actual Google Client ID:
     ```javascript
     const GOOGLE_CLIENT_ID = 'your_actual_google_client_id_here';
     ```

## Step 5: Test the Setup

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start your frontend server (Python HTTP server):
   ```bash
   python -m http.server 8000
   ```

3. Go to `http://localhost:8000` and navigate to the login or signup pages
4. Click the "Sign in with Google" button
5. Complete the Google OAuth flow

## Security Notes

- **Never commit your actual Google Client ID to version control if your repository is public**
- Keep your Client ID in environment variables
- For production, make sure to update:
  - Authorized origins in Google Cloud Console
  - The `API_URL` in your `config.js`
  - The `GOOGLE_CLIENT_ID` in your `config.js`

## Features Implemented

✅ **Login with Google**: Existing users can sign in with their Google accounts  
✅ **Register with Google**: New users can create accounts using Google  
✅ **Role Selection**: Users can choose between "Job Seeker" and "Company" roles during Google registration  
✅ **JWT Token Integration**: Seamless integration with your existing authentication system  
✅ **User Profile Creation**: Automatic profile creation with Google account information

## Troubleshooting

### Common Issues:

1. **"Invalid Client ID" Error**
   - Verify the Client ID in both `config.js` and `.env` files
   - Check that the domain is authorized in Google Cloud Console

2. **CORS Errors**
   - Ensure your server's CORS configuration includes your frontend domain
   - Check that authorized origins are correctly set in Google Cloud Console

3. **"Redirect URI Mismatch"**
   - Make sure all redirect URIs are properly configured in Google Cloud Console
   - Verify the exact URLs match (including http vs https)

### Debug Steps:
1. Check browser console for any JavaScript errors
2. Verify network requests in browser dev tools
3. Check server logs for backend errors
4. Ensure all environment variables are properly set

## API Endpoints Added

- `POST /api/auth/google` - Handle Google OAuth for login (creates user if doesn't exist)
- `POST /api/auth/google/register` - Handle Google OAuth for registration (fails if user exists)

Both endpoints accept:
```json
{
  "credential": "google_jwt_token",
  "role": "seeker" | "company"
}
```

And return:
```json
{
  "token": "your_jwt_token",
  "user": {
    "id": "user_id",
    "name": "user_name",
    "email": "user_email",
    "role": "user_role"
  },
  "isNewUser": true | false
}
```
