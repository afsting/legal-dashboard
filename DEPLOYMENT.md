# Infrastructure Deployment Guide

## OAuth Credentials Management

This project uses Google and Facebook OAuth providers for Cognito authentication. The credentials are stored securely in environment files.

### Setup

1. **Copy the environment template**:
   ```bash
   cp infrastructure/.env.example infrastructure/.env.local
   ```

2. **Update with your OAuth credentials**:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   ```

3. **Important**: `.env.local` is in `.gitignore` and will never be committed to version control.

### Deployment

#### Option 1: Using the Deploy Script (Recommended)
The deploy script automatically loads credentials from `.env.local` and deploys:

```bash
cd infrastructure
npm run deploy
```

This will:
- ✅ Load OAuth credentials from `.env.local`
- ✅ Pass them to CDK automatically
- ✅ Deploy the infrastructure with configured OAuth providers
- ✅ No need to manually specify context variables

#### Option 2: Manual CDK Deployment
If you need to deploy manually:

```bash
cd infrastructure
cdk deploy --all --require-approval never \
  -c googleClientId="your_client_id" \
  -c googleClientSecret="your_secret" \
  -c facebookAppId="your_app_id" \
  -c facebookAppSecret="your_app_secret"
```

### Verification

After deployment, verify OAuth providers are active:

```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_hPpfv1YSS \
  --client-id 3imu8ssrk5c4oqtc6sfq7iigkv \
  --region us-east-1 \
  --query 'UserPoolClient.SupportedIdentityProviders'
```

Should output: `["COGNITO", "Google", "Facebook"]`

### OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URIs:
   - `https://legal-dashboard-315326805073.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
4. Copy Client ID and Client Secret to `.env.local`

#### Facebook OAuth
1. Go to [Meta Developers Console](https://developers.facebook.com)
2. Create a Facebook App
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs:
   - `https://legal-dashboard-315326805073.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
5. Copy App ID and App Secret to `.env.local`

### Troubleshooting

**OAuth providers showing as unavailable in Cognito login?**
- Ensure `.env.local` has the correct credentials
- Run `npm run deploy` again - providers may have been removed if deploy ran without credentials
- Check CloudFormation events for provider creation failures

**Tokens not containing cognito:groups?**
- Verify users are assigned to groups in Cognito User Pool → Groups
- Check that ID tokens are requested (not just access tokens)
- Groups are included in the ID token by default

### Security Notes

- `❌ Never commit .env.local` - It's in `.gitignore` for protection
- `✅ Use `.env.example` to show what variables are needed
- `✅ Rotate credentials regularly` - Use `npm run rotate:jwt` for JWT secrets
- `✅ Store in secure location` - Use AWS Secrets Manager in production
