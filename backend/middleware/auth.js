const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Token ausente.' });
  }
  
  try {
    const [, token] = auth.split(' ');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error(`[AUTH] Token inválido para ${req.method} ${req.path}:`, err.message);
    res.status(401).json({ error: 'Token inválido.' });
  }
};

module.exports = {
  authenticateToken,
  JWT_SECRET
}; 