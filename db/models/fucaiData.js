const mongoose = require('mongoose');

const fucaiDataSchema = new mongoose.Schema({
  code: { type: String, required: true },
  date: { type: String, required: true },
  red: { type: String, required: true },
  blue: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
// 
fucaiDataSchema.index({ code: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('FucaiData', fucaiDataSchema);