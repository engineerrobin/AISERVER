var express = require('express');
// 使用express.json中间件解析JSON请求体
var router = express.Router();
router.use(express.json());
// 引入user模型
const User = require('../db/models/userMoudle');
// 引入role模型
const Role = require('../db/models/roleMoudle');
// 引入token使用日志模型
const TokenUsageLog = require('../db/models/tokenUseLog');
// 引入fucaiData模型
const FucaiData = require('../db/models/fucaiData');
// 引入getCurrentUserMenus函数
const { getCurrentUserMenus } = require('../controllers/getMenu');
// 引入md5模块用于加密密码
const md5 = require('md5');
// 引入jsonwebtoken模块
const jwt = require('jsonwebtoken');
// 定义一个密钥，用于签名和验证JWT
const secretKey = 'your_secret_key';
// 引入token验证中间件
const tokencheck = require('../middlewares/tokencheck');

// 登录处理
router.post('/login', function(req, res, next) {
  const { username, password } = req.body;
  console.log('Login request received:', { username, password });
  // 在数据库中查找用户
  // findOne:根据条件查询单个文档，如果找到多个匹配的文档，则返回第一个匹配的文档；如果没有找到匹配的文档，则返回null。
  User.findOne({ username, password: md5(password) }).then((user) => {
    console.log('Found user:', user);
    // 如果没有找到用户，返回错误信息
    if (!user) {
      return res.json({ status: 'error', statusCode: 400, message: '用户名或密码错误' });
    }
    // 登录成功
    // 设置JWT
    const token = jwt.sign({ username, userId: user._id }, secretKey, { expiresIn: '1h' }); // 1小时过期
    res.json({
       status: 'success', 
       statusCode: 200,
        message: '登录成功', 
        token,
        username: user.username,
        role: user.roleId,
        // 将用户的_id作为userId返回给前端，方便请求鉴权接口
        // userId: user._id
      });
  }).catch((err) => {
    console.error('Error finding user:', err);
    res.json({ status: 'error', statusCode: 500, message: '登录失败' });
  });
});
// 注册
router.post('/register', function(req, res, next) {
  const { username, password, phone } = req.body;
  // 检查用户名是否已存在
  User.findOne({ username }).then(async (existingUser) => {
    if (existingUser) {
      return res.json({ status: 'error', statusCode: 400, message: '用户名已存在' });
    }
    const role = await Role.findOne({ name: 'vip' });
    // 创建新用户（User.create 是 new User + save 的语法糖，一步完成实例化并保存）
    User.create({
      username,
      password: md5(password), // 使用md5加密密码
      phone,
      status: 'primary', // 设置默认状态为primary
      roleId: role._id // 设置默认角色为普通用户
    }).then(() => {
      res.json({ status: 'success', statusCode: 200, message: '注册成功' });
    }).catch((err) => {
      if(err.code === 11000) {
        // 处理唯一性约束错误（例如用户名或手机号重复）
        return res.json({ status: 'error', statusCode: 400, message: '手机号已存在' });
      }
      res.json({ status: 'error', statusCode: 500, message: '注册失败' });
    });
  }).catch((err) => {
    console.error('Error checking existing user:', err);
    res.json({ status: 'error', statusCode: 500, message: '注册失败' });
  });
});
// 退出登录（使用 POST，避免通过跨站链接触发）
router.post('/logout', function(req, res, next) {
  // 这里可以做一些清理工作，比如在服务端记录用户的登出时间等
  res.json({ status: 'success', statusCode: 200, message: '退出登录成功' });
});
// 获取menu列表
router.get('/menu', tokencheck, getCurrentUserMenus);
// 获取用户token余额
router.get('/balance', tokencheck, async (req, res) => {
  const user = await User.findById(req.user.userId).select('tokensBalance');
  res.json({ balance: user.tokensBalance });
});
// 获取指定期数的双色球数据
router.get('/ssq', async (req, res) => {
  const issue = req.query.issue;
  console.log('Fetching ssq data for issue:', issue);
  try {
    const data = await FucaiData.find()
    // 根据期号升序排序，并限制返回的条数为指定的期数（sort对象的key是字段名，1表示升序，-1表示降序）
    .sort({code: -1})
    // 限制返回的条数为指定的期数
    .limit(issue)
    // 将查询结果转换为普通 JavaScript 对象，方便后续处理
    .lean()
    ;
    let array = [];
  if (data && data.length > 0) {
    data.forEach(item => {
      array.push({
        period: item.code.slice(-5), // 取期号的后5位作为期数
        // 将红球字符串拆分为数组，并转换为数字类型
        reds: item.red.split(',').map(Number),
        blue: Number(item.blue),
      });
    });
  }
    res.json({ status: 'success', statusCode: 200, data: array, message: '获取数据成功' });
  } catch (err) {
    console.error('Error fetching ssq data:', err);
    res.json({ status: 'error', statusCode: 500, message: '获取数据失败' });
  }
  });
  // 获取用户的token使用记录
  router.get('/token-usage', tokencheck, async (req, res) => {
    try {
      const usageLogs = await TokenUsageLog.find({ userId: req.user.userId })
      // 按创建时间升序排序，方便按时间顺序查看使用记录,最新的记录在最后
        .sort({ createdAt: 1 })
        .lean();
      // 构造返回的数据结构
      // obj用来按日期分组使用记录，方便统计每天的使用情况
      let obj = {};
      usageLogs.forEach(log => {
        const date = log.createdAt.toISOString().split('T')[0]; // 获取日期部分
        // 按日期分组使用记录
        if (!obj[date]) {
          obj[date] = [];
        }
        // 将当前日期的token使用记录加入对应的数组
        obj[date].push(log.tokensUsed);
      });
      // 结算每天的token使用总量
      let dailyUsage = {};
      for (const date in obj) {
        dailyUsage[date] = obj[date].reduce((sum, tokens) => sum + tokens, 0);
      }
      res.json({ status: 'success', statusCode: 200, data: dailyUsage, message: '获取数据成功' });
    } catch (err) {
      console.error('Error fetching token usage logs:', err);
      res.json({ status: 'error', statusCode: 500, message: '获取数据失败' });
    }
  });
  // 返回用户token余额
  router.get('/tokenbalance', tokencheck, async (req, res) => {
    try {
      // select用于指定返回的字段，这里只返回tokensBalance字段
      const user = await User.findById(req.user.userId).select('tokensBalance');
      res.json({ status: 'success', statusCode: 200, data:user, message: '获取数据成功' });
    } catch (err) {
      res.json({ status: 'error', statusCode: 500, message: '获取数据失败' });
    }
  });

module.exports = router;
