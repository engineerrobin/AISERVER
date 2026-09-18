const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  name: { type: String, required: true },    // 菜单显示名
  path: { type: String, required: true },    // 路由路径
  component: { type: String },               // 前端组件名,作用是告诉前端应该渲染哪个组件
  icon: { type: String },// 菜单图标
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', default: null }, // 父级ID，null为根菜单
  sort: { type: Number, default: 0 }// 排序字段，默认0
}, { timestamps: true });

module.exports = mongoose.model('Menu', MenuSchema);