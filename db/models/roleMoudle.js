const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true }, // admin, editor, viewer
  menuIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }] // 权限核心
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
