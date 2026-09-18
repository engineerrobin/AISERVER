// 引入mongoose模块
const mongoose = require('mongoose');
// 定义用户的Schema，包含username、password和phone三个字段
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // 实际存储加密后的
  phone: { type: String, unique: true, required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true }, // 关键：关联角色，ref指定关联的模型名称
  tokensBalance: { type: Number, default: 20000 }, // 初始可用 Token 额度
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
// 创建用户模型
const User = mongoose.model('User', UserSchema);
// 导出用户模型
module.exports = User;