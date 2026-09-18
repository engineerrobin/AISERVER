// 引入dotenv模块，用于加载环境变量
// require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// 引入路由登录和注册路由
var indexRouter = require('./routes/index');
// 引入路由聊天路由
var chatRouter = require('./routes/chat');
var app = express();
// 引入 connect-history-api-fallback 模块，用于前端路由的历史模式支持
var history = require('connect-history-api-fallback');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// 使用路由中间件处理 API 请求
app.use('/api', indexRouter);
app.use('/api', chatRouter);
// 使用静态文件中间件处理前端资源请求
app.use(express.static(path.join(__dirname, 'public')));
// 所有非 API 请求都交给前端路由处理
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 引入 connect-history-api-fallback 模块 
app.use(history());
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
