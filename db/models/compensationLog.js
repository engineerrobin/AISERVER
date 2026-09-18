const mongoose = require('mongoose');

const CompensationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tokensUsed: Number,
  model: String,
  error: String,          // 原始错误信息
  createdAt: { type: Date, default: Date.now },
  retried: { type: Boolean, default: false }, // 是否已重试成功
  retryCount: { type: Number, default: 0 },
});

module.exports = mongoose.model('CompensationLog', CompensationLogSchema);