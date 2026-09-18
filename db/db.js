// 引入 数据库地址、端口和数据库名称等配置信息
const {DBURL,DBPORT,DBNAME} = require('../config/index');
module.exports=function(suc,err){
    const mongoose = require('mongoose');
    // mongoose.connect('mongodb://localhost:27017/name');
    // 连接数据库，参数是数据库的URL地址，格式为mongodb://<host>:<port>/<database>
    // 这里连接的是本地数据库，如果没有会自动创建
    mongoose.connect(`mongodb://${DBURL}:${DBPORT}/${DBNAME}`);
    mongoose.connection.on('open', () => {
        suc();
    });
    // 监听连接错误事件
    mongoose.connection.on('error', (err) => {
        // 判断errs是否为函数，如果是则调用它并传入错误对象
        if (typeof err === 'function') {
            err(err);
        } else {
            console.error('MongoDB connection error:', err);
        }
    });
    // 监听连接断开事件
    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });
}