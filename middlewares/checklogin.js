// 封装一个中间件函数，检查用户是否已登录
module.exports = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/acount/login');
    }
    next();
};