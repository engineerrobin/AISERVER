// token验证中间件

const jwt = require('jsonwebtoken');
const secretKey = 'your_secret_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  // 判断Authorization头是否存在，并兼容两种格式：Bearer <token> 或纯 token
  if (!authHeader) {
    return res.json({ status: 'error', statusCode: 401, message: '缺少Authorization请求头' });
  }
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  if (!token) {
    return res.json({ status: 'error', statusCode: 401, message: 'Token为空' });
  }
  // 验证JWT
  jwt.verify(token, secretKey, (err, data) => {
    if (err) {
      console.log('JWT verification failed:', err);
      return res.json({ status: 'error', statusCode: 401, message: 'token已过期' });
    }
    // JWT验证成功，将解码后的用户信息存储在请求对象中，供后续路由处理使用
    req.user = data;
    console.log('JWT verification successful:', data);
    next();
  });
}

module.exports = authenticateToken;