const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

const COGNITO_REGION = 'us-east-1';
const COGNITO_USER_POOL_ID = 'us-east-1_hPpfv1YSS';
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
const COGNITO_JWKS_URL = `${COGNITO_ISSUER}/.well-known/jwks.json`;

let cachedJwks = null;
let jwksCacheTime = null;
const JWKS_CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Fetch and cache JWKS from Cognito
const getJwks = async () => {
  const now = Date.now();
  
  // Return cached JWKS if still valid
  if (cachedJwks && jwksCacheTime && now - jwksCacheTime < JWKS_CACHE_DURATION) {
    return cachedJwks;
  }

  try {
    const response = await fetch(COGNITO_JWKS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
    }
    cachedJwks = await response.json();
    jwksCacheTime = now;
    return cachedJwks;
  } catch (error) {
    console.error('Error fetching Cognito JWKS:', error);
    throw error;
  }
};

// Get specific key from JWKS
const getKeyFromJwks = async (kid) => {
  const jwks = await getJwks();
  const key = jwks.keys.find(k => k.kid === kid);
  
  if (!key) {
    throw new Error('Key not found in JWKS');
  }

  return key;
};

// Convert JWKS key to PEM format
const jwkToPem = (jwk) => {
  const crypto = require('crypto');
  
  // Create a key object from JWKS
  const keyObject = crypto.createPublicKey({
    key: jwk,
    format: 'jwk',
  });

  // Export as PEM
  return keyObject.export({ format: 'pem', type: 'spki' });
};

// Verify Cognito token
const verifyCognitoToken = async (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new Error('Invalid token format');
    }

    const { header, payload } = decoded;
    const kid = header.kid;

    if (!kid) {
      throw new Error('No key ID in token header');
    }

    // Get the public key from Cognito
    const key = await getKeyFromJwks(kid);
    const pem = jwkToPem(key);

    // Verify the token
    const verified = jwt.verify(token, pem, {
      issuer: COGNITO_ISSUER,
      algorithms: ['RS256'],
    });

    return verified;
  } catch (error) {
    console.error('Cognito token verification error:', error);
    throw new Error('Invalid Cognito token');
  }
};

// Support both legacy JWT and Cognito tokens
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;

    // Try to verify as Cognito token first
    try {
      decoded = await verifyCognitoToken(token);
      // Extract user info from Cognito token, including groups
      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.preferred_username,
        picture: decoded.picture,
        groups: decoded['cognito:groups'] || [],
        isAdmin: decoded['cognito:groups']?.includes('admin') || false,
      };
    } catch (cognitoError) {
      // Fall back to legacy JWT verification
      try {
        const secret = await getJwtSecret();
        decoded = jwt.verify(token, secret);
        req.user = decoded;
      } catch (legacyError) {
        console.error('Both token types failed:', { cognitoError: cognitoError.message, legacyError: legacyError.message });
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin middleware supporting both token types
const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let decoded;
    let isAdmin = false;

    // Try Cognito first
    try {
      decoded = await verifyCognitoToken(token);
      // Check if user is in admin group in Cognito
      isAdmin = decoded['cognito:groups']?.includes('admin') || false;
      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.preferred_username,
        picture: decoded.picture,
        isAdmin,
      };
    } catch (cognitoError) {
      // Fall back to legacy JWT
      try {
        const secret = await getJwtSecret();
        decoded = jwt.verify(token, secret);
        isAdmin = decoded.role === 'admin';
        req.user = decoded;
      } catch (legacyError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const generateToken = async (userId, userData) => {
  const secret = await getJwtSecret();
  return jwt.sign(
    { userId, ...userData },
    secret,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  generateToken,
  verifyCognitoToken,
};
