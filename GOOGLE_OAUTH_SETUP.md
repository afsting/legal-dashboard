# Google OAuth Configuration Guide

## Problem
If you're seeing a 400 error when trying to sign in with Google, the redirect URI in Google Cloud Console is likely incorrect.

## Solution

Google OAuth must be configured with **Cognito's OAuth2 response endpoint**, NOT your application's callback URL.

### Step 1: Get Your Cognito OAuth Response URI
Your Cognito domain is configured as: `legal-dashboard-315326805073`

Your Google OAuth redirect URI should be:
```
https://legal-dashboard-315326805073.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

### Step 2: Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Click on your OAuth 2.0 Client ID (Web application)
4. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://legal-dashboard-315326805073.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
5. Remove any other redirect URIs like `http://localhost:5173/auth/callback`
6. Click **Save**

### Step 3: Update Application Configuration
No changes needed in `cognito.js` - the application redirect URI is correct.

## How OAuth Flow Works

```
1. User clicks "Sign in with Google" on app
   ↓
2. App redirects to Cognito Login URL
   redirect_uri=https://d1bkh7cjshkl4w.cloudfront.net/auth/callback
   ↓
3. Cognito hosted UI shows Google button
   ↓
4. User clicks Google button
   ↓
5. Cognito redirects to Google OAuth
   redirect_uri=https://legal-dashboard-315326805073.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ↓
6. User authenticates with Google
   ↓
7. Google redirects back to Cognito (at idpresponse URL)
   ↓
8. Cognito exchanges code for tokens
   ↓
9. Cognito redirects user to app callback
   redirect_uri=https://d1bkh7cjshkl4w.cloudfront.net/auth/callback (with auth code)
   ↓
10. App exchanges auth code for ID/Access tokens
    ↓
11. User logged in!
```

## Configuration Summary

| Endpoint | Purpose | Configuration |
|----------|---------|---|
| **App Callback** | Where app receives auth code from Cognito | `src/utils/cognito.js` - `REDIRECT_URI` |
| **Cognito Response** | Where Google redirects after auth | Google OAuth console - **Authorized redirect URIs** |

## Troubleshooting

### Still seeing 400 error?
1. Check Google Cloud Console - Authorized redirect URIs
2. Make sure you saved changes in Google Console
3. Clear browser cache and try again
4. Check that Cognito domain matches: `legal-dashboard-315326805073`

### Seeing "Login option is not available"?
- Identity providers may not be configured in Cognito
- Run: `npm run deploy` in infrastructure folder
- Wait 2-3 minutes for CloudFront to invalidate cache

### State parameter errors?
- Clear localStorage in browser DevTools
- Ensure your app URL matches one of the Cognito callback URLs
