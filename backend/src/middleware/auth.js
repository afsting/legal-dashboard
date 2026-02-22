/**
 * INTENT: Verify incoming requests are authenticated via Cognito.
 * Accepts Cognito ID tokens (RS256, verified against Cognito JWKS).
 * Sets req.user with userId, email, name, groups, isAdmin.
 */

const jwt = require('jsonwebtoken');

const COGNITO_REGION = 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_hPpfv1YSS';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
const COGNITO_JWKS_URL = `${COGNITO_ISSUER}/.well-known/jwks.json`;

// Cache JWKS for 1 hour to avoid repeated network calls
let cachedJwks = null;
let jwksCacheTime = null;
const JWKS_CACHE_DURATION = 3600000;

const getJwks = async () => {
  const now = Date.now();
  if (cachedJwks && jwksCacheTime && now - jwksCacheTime < JWKS_CACHE_DURATION) {
    return cachedJwks;
  }

  const response = await fetch(COGNITO_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Cognito JWKS: ${response.statusText}`);
  }
  cachedJwks = await response.json();
  jwksCacheTime = now;
  return cachedJwks;
};

const getKeyFromJwks = async (kid) => {
  const jwks = await getJwks();
  const key = jwks.keys.find(k => k.kid === kid);
  if (!key) {
    throw new Error('Signing key not found in Cognito JWKS');
  }
  return key;
};

const jwkToPem = (jwk) => {
  const crypto = require('crypto');
  const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return keyObject.export({ format: 'pem', type: 'spki' });
};

/**
 * INTENT: Verify a Cognito token and return its decoded payload.
 * Input: JWT string (Cognito ID or access token)
 * Output: decoded payload with sub, email, cognito:groups, etc.
 */
const verifyCognitoToken = async (token) => {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const { header, payload } = decoded;
  if (!header.kid) {
    throw new Error('No key ID in token header');
  }

  const key = await getKeyFromJwks(header.kid);
  const pem = jwkToPem(key);

  return jwt.verify(token, pem, {
    issuer: COGNITO_ISSUER,
    algorithms: ['RS256'],
  });
};

/**
 * INTENT: Authenticate any request using Cognito token.
 * Rejects requests with missing or invalid tokens.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = await verifyCognitoToken(token);
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.preferred_username,
      picture: decoded.picture,
      groups: decoded['cognito:groups'] || [],
      isAdmin: decoded['cognito:groups']?.includes('admin') || false,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * INTENT: Authenticate and require admin group membership.
 * Rejects non-admin users with 403.
 */
const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = await verifyCognitoToken(token);
    const isAdmin = decoded['cognito:groups']?.includes('admin') || false;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.preferred_username,
      picture: decoded.picture,
      groups: decoded['cognito:groups'] || [],
      isAdmin,
    };

    next();
  } catch (error) {
    console.error('Admin middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  verifyCognitoToken,
};
