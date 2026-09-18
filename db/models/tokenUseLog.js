const mongoose = require('mongoose');
const tokenUsageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokensUsed: { type: Number, required: true },    // total_tokens
  model: { type: String, required: true },         // deepseek-chat / deepseek-reasoner
  endpoint: { type: String, default: '/v1/chat/completions' },// 接口路径
  requestId: { type: String },                     // 可选的请求追踪 ID
  createdAt: { type: Date, default: Date.now, index: true }
});

// 复合索引加速按用户和时间的统计查询，时间为降序排列，方便获取最近的使用记录
// 复合索引：即每条查询都会先按 userId 排序，再按 createdAt 排序，适合查询某个用户的最近使用记录
tokenUsageLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('TokenUsageLog', tokenUsageLogSchema);