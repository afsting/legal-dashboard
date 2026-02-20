// Cognito Authentication Configuration
const COGNITO_DOMAIN = 'legal-dashboard-315326805073'
const COGNITO_REGION = 'us-east-1'
const COGNITO_CLIENT_ID = '3imu8ssrk5c4oqtc6sfq7iigkv'
const COGNITO_POOL_ID = 'us-east-1_hPpfv1YSS'

// Get appropriate redirect URI based on environment
const getRedirectUri = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5173/auth/callback'
  }
  return 'https://d1bkh7cjshkl4w.cloudfront.net/auth/callback'
}

const REDIRECT_URI = getRedirectUri()

const COGNITO_AUTH_URL = `https://${COGNITO_DOMAIN}.auth.${COGNITO_REGION}.amazoncognito.com`

export const cognitoConfig = {
  region: COGNITO_REGION,
  userPoolId: COGNITO_POOL_ID,
  clientId: COGNITO_CLIENT_ID,
  authDomain: COGNITO_DOMAIN,
  authUrl: COGNITO_AUTH_URL,
  redirectUri: REDIRECT_URI,
  responseType: 'code',
  scope: 'email openid profile',
}

// PKCE Helper Functions
// Generate code verifier (random 128-character string)
const generateCodeVerifier = () => {
  const length = 128
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let verifier = ''
  for (let i = 0; i < length; i++) {
    verifier += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return verifier
}

// Generate code challenge from verifier using SHA-256
const generateCodeChallenge = async (verifier) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hash))
  const hashString = hashArray.map(b => String.fromCharCode(b)).join('')
  return btoa(hashString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Generate login URL for Cognito hosted UI with PKCE
export const getLoginUrl = async () => {
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  // Store verifier in sessionStorage for later use in token exchange
  sessionStorage.setItem('pkce_code_verifier', codeVerifier)
  
  const params = new URLSearchParams({
    response_type: cognitoConfig.responseType,
    client_id: cognitoConfig.clientId,
    redirect_uri: cognitoConfig.redirectUri,
    scope: cognitoConfig.scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${cognitoConfig.authUrl}/oauth2/authorize?${params.toString()}`
}

// Exchange authorization code for tokens using PKCE
export const exchangeCodeForTokens = async (code) => {
  // Retrieve the code verifier from sessionStorage
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier')
  if (!codeVerifier) {
    throw new Error('PKCE code verifier not found. Please try logging in again.')
  }
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cognitoConfig.clientId,
    code: code,
    redirect_uri: cognitoConfig.redirectUri,
    code_verifier: codeVerifier,
  })

  try {
    const response = await fetch(`${cognitoConfig.authUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Token exchange error response:', error)
      throw new Error('Token exchange failed')
    }

    // Clear the stored verifier after successful exchange
    sessionStorage.removeItem('pkce_code_verifier')

    return await response.json()
  } catch (error) {
    console.error('Token exchange error:', error)
    throw error
  }
}

// Decode JWT token (basic decoding, server validation required)
export const decodeToken = (token) => {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token')
  }

  try {
    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch (error) {
    throw new Error('Failed to decode token')
  }
}

// Get user info from ID token
export const getUserFromToken = (idToken) => {
  const decoded = decodeToken(idToken)
  return {
    email: decoded.email,
    name: decoded.name || decoded.preferred_username || decoded.email,
    picture: decoded.picture,
    sub: decoded.sub, // Cognito user ID
    groups: decoded['cognito:groups'] || [], // Extract group memberships
    isAdmin: decoded['cognito:groups']?.includes('admin') || false,
  }
}

// Validate token expiration
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token)
  if (!decoded.exp) return true
  return Date.now() >= decoded.exp * 1000
}

// Generate logout URL
export const getLogoutUrl = () => {
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.redirectUri,
  })
  return `${cognitoConfig.authUrl}/logout?${params.toString()}`
}
