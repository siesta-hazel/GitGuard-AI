const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-local-jwt-secret');
  if (!secret) {
    console.error('JWT_SECRET is not configured in environment');
    return res.status(500).json({ error: 'Authentication service misconfigured' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

module.exports = authenticateToken;
