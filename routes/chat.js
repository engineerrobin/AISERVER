var express = require('express');
var router = express.Router();
// 引入openai模块
const OpenAI = require('openai');
const { XING, MING } = require('../config');
// 引入token验证中间件
const tokencheck = require('../middlewares/tokencheck');
// 引入token使用日志模型
const TokenUseLog = require('../db/models/tokenUseLog');
// 引入补偿日志模型
const CompensationLog = require('../db/models/compensationLog');
// 引入用户模型
const User = require('../db/models/userMoudle');
// 2. 配置 DeepSeek 客户端
const openai = new OpenAI({
    apiKey: XING,
    baseURL: MING
});
// 
  let tokensUsed = 0;
  let hasUsage = false;
// 流式接口
// router.post('/chat', async (req, res) => {
router.post('/chat', tokencheck, async (req, res) => {
  const userId = req.user.userId;// 从token验证中间件中获取用户ID
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.json({ state: 'error', statusCode: 400, message: '参数错误' });
  }
  // 设置 SSE 响应头 (前端代码不用变)
  // text/event-stream 是 SSE 的 MIME 类型，表示服务器会持续发送事件流给客户端
  res.setHeader('Content-Type', 'text/event-stream');
  // no-cache 表示不缓存响应，确保客户端每次都能接收到最新的数据
  res.setHeader('Cache-Control', 'no-cache');
  // keep-alive 表示保持连接不断开，以便服务器可以持续发送数据
  res.setHeader('Connection', 'keep-alive');

  try {
    // 调用 DeepSeek API，启用流式输出
    const stream = await openai.chat.completions.create({
      // model的值可以根据DeepSeek的文档进行调整
      model: 'deepseek-v4-pro', 
      // messages是一个数组，包含用户的输入消息,目的是为了让模型知道上下文
      messages: messages,
      // stream: true 表示启用流式输出，模型会逐步返回生成的内容，而不是一次性返回完整的响应
      stream: true,
      // 思考
      thinking: {"type": "disabled"},
      max_tokens: 20000, // 设置最大生成的 token 数量
    });

    // 逐块读取并转发给前端
    for await (const chunk of stream) {
      // chunk.choices[0].delta.content 是模型生成的内容,有时可能为空，所以要做空值判断
      const content = chunk.choices[0]?.delta?.content || '';
      // console.log('Received chunk from DeepSeek API:', content);
      if (content) {
        // 保持与前端一致的 SSE 格式 (data: xxx\n\n),\n\n 是 SSE 的分隔符，就是告诉前端一条完整的消息已经发送完毕（返回json格式）
        res.write(`data: ${JSON.stringify(content)}\n\n`);
      }

      console.log(chunk);
      // 统计使用的tokens
      const usage = chunk.usage || chunk.choices?.[0]?.usage;
      if (usage && usage.total_tokens) {
        tokensUsed = usage.total_tokens;
        hasUsage = true;
      }
      // 如果模型返回的 finish_reason 是 'stop'，表示生成已经完成，可以提前结束循环
      if (chunk.choices[0]?.finish_reason === 'stop') {
        break;
      }
    }


    // 3. 流结束，进行扣费和日志记录
    if (hasUsage && tokensUsed > 0) {
      await deductTokensAndLog(userId, tokensUsed, 'deepseek-chat');
    } else {
      // 未获取到 usage，记录异常（不扣费，但保留内容返回）
      console.warn(`[WARN] 用户 ${userId} 流式响应无 usage，未扣费`);
      // 可写入一个特殊日志用于审计
    }
    // 发送结束标记
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('DeepSeek API 错误:', error);
// 将错误信息包装成 JSON 对象
    const errorPayload = JSON.stringify({ error: true, message: error.message });
    res.write(`data: ${errorPayload}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});
/**
 * 扣费 + 日志（无事务，原子扣费 + 尽力日志）
 */
async function deductTokensAndLog(userId, tokensUsed, model) {
  // 1. 原子扣费（带余额条件）
  const user = await User.findOneAndUpdate(
    { _id: userId, tokensBalance: { $gte: tokensUsed } },
    { $inc: { tokensBalance: -tokensUsed } },
    { new: true }
  );

  if (!user) {
    // 余额不足，扣费失败，抛出异常（但 AI 结果已返回，需记录）
    throw new Error('余额不足，扣费失败');
  }

  // 2. 尽力插入日志
  try {
    await TokenUseLog.create({ userId, tokensUsed, model });
  } catch (err) {
    // 日志插入失败，写入补偿表(用来后续人工或定时任务处理)
    await CompensationLog.create({
      userId,
      tokensUsed,
      model,
      error: err.message,
    });
    // 触发告警（可发邮件、钉钉等）
    console.error('[CRITICAL] 日志插入失败，已写入补偿表:', { userId, tokensUsed });
  }
}
module.exports = router;
