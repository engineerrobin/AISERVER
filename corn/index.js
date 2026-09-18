// 引入 node-cron 模块，用于定时任务调度
const cron = require('node-cron');
// 引入爬虫服务模块
const { crawlAndSave } = require('../services/crawler');
// 引入配置文件
const { CRAWL_REFRESH_CRON } = require('../config/index');
// 获取定时任务表达式，如果环境变量中没有设置，则使用默认值 '*/25 * * * *'，表示每25分钟执行一次
const cronExpression = CRAWL_REFRESH_CRON || '*/120 * * *';

function startCrawler() {
  console.log(`定时任务启动，表达式: ${cronExpression}`);
  // 首次立即执行
  crawlAndSave();
  // 定时执行
  cron.schedule(cronExpression, () => {
    crawlAndSave();
  });
}
module.exports = startCrawler;