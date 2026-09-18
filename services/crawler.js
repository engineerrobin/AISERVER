const axios = require('axios');
// wrapper是axios-cookiejar-support提供的一个函数，用于增强axios实例，使其支持cookie管理
const { wrapper } = require('axios-cookiejar-support');
// tough-cookie是一个用于处理cookie的库，CookieJar是其中的一个类，用于存储和管理cookie
const { CookieJar } = require('tough-cookie');
// 引入数据库模型
const FucaiData = require('../db/models/fucaiData');
// 获取环境变量
// require('dotenv').config();
// 引入配置文件
const { CRAWL_HOME_URL, CRAWL_DATA_URL } = require('../config/index');
// 创建一个axios实例，并增强其支持cookie管理
// jar是一个用于存储和管理cookie的对象，类似于浏览器中的cookie存储
const jar = new CookieJar();
// 创建axios实例，并增强其支持cookie管理
const client = wrapper(axios.create({
  jar,
  // withCredentials: true 表示在跨域请求中也会携带cookie
  withCredentials: true,
  timeout: 10000,
  headers: {
    // 'Accept': 'application/json, text/plain, */*',
    // 'Referer': CRAWL_HOME_URL,
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    // 'Cookie': '21_vq=34',
    'Host': 'www.cwl.gov.cn',
    'Referer': 'https://www.cwl.gov.cn/ygkj/wqkjgg/ssq/',
    'Sec-CH-UA': '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  }
}));

// 刷新Cookie
async function refreshCookie() {
  console.log(`[${new Date().toISOString()}] 刷新Cookie...`);
  try {
    await client.get(CRAWL_HOME_URL, {
    // 最大重定向次数，防止无限重定向
      maxRedirects: 5,
      // validateStatus是axios的一个配置项，用于自定义响应状态码的验证逻辑，这里设置为只要状态码小于400就认为请求成功
      validateStatus: status => status < 400,
    });
    console.log('[Cookie刷新成功]');
    return true;
  } catch (err) {
    console.error('[Cookie刷新失败]', err.message);
    return false;
  }
}

// 请求接口数据（带重试）
async function fetchData(retries = 3) {
  try {
    const response = await client.get(CRAWL_DATA_URL, {
      params: {
                name: 'ssq',        // 彩种：ssq 代表双色球[reference:8]
                issueCount: '',     // 获取最近100期数据[reference:9]
                issueStart: '',       // 起始期号
                issueEnd: '',         // 结束期号
                dayStart: '',         // 起始日期
                dayEnd: '',           // 结束日期
                pageNo: 1,            // 页码
                pageSize: 5,         // 每页条数
                week: '',             // 星期
                systemType: 'PC'      // 系统类型
      },
    });
    // 返回数据
    return response.data;
  } catch (err) {
    if (retries > 0 && err.response && err.response.status === 401) {
      console.log('[Cookie失效，尝试刷新]');
      await refreshCookie();
      return fetchData(retries - 1);
    }
    throw err;
  }
}

// 主任务：抓取并保存
async function crawlAndSave() {
  try {
    // 先在首页获取cookie，确保后续请求能成功
    await refreshCookie(); // 确保Cookie有效
    const data = await fetchData();
    // 根据实际接口结构调整解析逻辑
    const items = data.result || data.list || [data];
    // 遍历每一条数据，保存到数据库中
    for (const item of items) {
      const doc = {
        date: item.date ,
        code: item.code,
        red: item.red,
        blue: item.blue,

      };
      // 使用 findOneAndUpdate 方法进行去重保存，如果已存在则更新，否则插入新数据
      await FucaiData.findOneAndUpdate(
        { code: doc.code, date: doc.date }, // 查询条件
        doc, // 更新内容
        { upsert: true, new: true } // 如果不存在则插入新文档，并返回新文档
      );
    }       
    console.log(`[${new Date().toISOString()}] 数据保存成功，${items.length} 条`);
  } catch (err) {
    console.error('[爬取失败]', err);
  }
}

module.exports = { crawlAndSave, refreshCookie, fetchData };