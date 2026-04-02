import jwt from 'jsonwebtoken';

export const authMiddleware = (jwtSecret) => (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
