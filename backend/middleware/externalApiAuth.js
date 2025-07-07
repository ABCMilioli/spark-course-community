// Middleware para autenticação de API externa via token
module.exports = function externalApiAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;
  const expected = process.env.EXTERNAL_API_TOKEN;
  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'Token de autenticação inválido.' });
  }
  next();
}; 