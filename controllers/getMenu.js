const User = require('../db/models/userMoudle');
const Menu = require('../db/models/menuMoudle');
const Role = require('../db/models/roleMoudle');

// 核心接口：获取当前登录用户的菜单
exports.getCurrentUserMenus = async (req, res) => {
  try {
    // 1. 从鉴权中间件获取真实的 userId（安全！）
    const userId = req.user.userId;
    if (!userId) {
      return res.json({status:'error', statusCode: 401, message: '未登录或无效的token'});
    }

    // 2. 查询用户信息，并关联角色信息（roleId），确保获取到用户的角色和菜单权限，user是一个包含用户信息和角色信息的对象
    const user = await User.findById(userId).populate('roleId');
    console.log('Fetched user with role:', user);
    if (!user) {
      return res.json({status:'error', statusCode: 404, message: '用户不存在'});
    }

    // 3. 检查用户是否分配了角色
    if (!user.roleId) {
      return res.json({status:'error', statusCode: 200, message: '该用户未分配角色，无菜单'});
    }

    // 4. 获取角色下的菜单ID列表
    // user集合并没有menuIds字段，menuIds是通过roleId关联的角色获取的
    const menuIds = user.roleId.menuIds;
    if (!menuIds || menuIds.length === 0) {
      return res.json({status:'error', statusCode: 200, message: '该角色未配置菜单'});
    }

    // 5. 查询这些菜单的具体信息
    // 注意：使用 lean() 提升性能，返回纯JS对象方便后续操作,$in是MongoDB的查询操作符，用于匹配数组中的值
    const menus = await Menu.find({ _id: { $in: menuIds } }).lean();
    res.json({status:'success', statusCode: 200, data: menus, message: '获取菜单成功'});
  } catch (error) {
    console.error('获取菜单异常:', error);
    res.json({status:'error', statusCode: 500, message: '服务器内部错误'});
  }
};