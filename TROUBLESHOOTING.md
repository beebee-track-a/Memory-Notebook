# 🔧 连接问题排查指南

## 问题描述
WebSocket 连接失败，状态码 1006（认证失败）

## ✅ 已完成的修复

### 1. 修改认证方式
- ❌ **旧方式**: 使用 Secret Key 生成 HMAC-SHA256 签名
- ✅ **新方式**: 使用 API Key 作为 Token 直接认证

### 2. 添加详细日志
- 在 `App.tsx` 中添加环境变量检查日志
- 在 `useDoubaoLive.ts` 中添加连接过程日志
- 在 `doubaoAuth.ts` 中添加认证参数日志

### 3. 更新测试工具
- 支持 Token 认证和签名认证两种方式
- 默认使用 Token 认证（推荐）

## 🧪 测试步骤

### 方法一：使用主应用测试

1. **停止当前开发服务器** (Ctrl+C)

2. **确认环境变量配置**
   ```bash
   node check-env.js
   ```
   确保输出显示：
   - ✅ AI Provider: doubao
   - ✅ VITE_DOUBAO_APP_ID 已设置
   - ✅ VITE_DOUBAO_API_KEY 已设置

3. **重新启动开发服务器**
   ```bash
   npm run dev
   ```

4. **打开浏览器并打开开发者工具 (F12)**

5. **查看 Console 标签页**，应该看到：
   ```
   🔍 App mounted. Checking environment:
     - AI Provider: doubao
     - Doubao AppID exists: true
     - Doubao AppID preview: 2111845224...
     - Doubao API Key exists: true
     - Doubao API Key preview: AKLTMjliZj...
   ```

6. **点击麦克风按钮**，观察控制台输出：
   ```
   🔍 检查豆包环境变量: { ... }
   🎤 请求麦克风访问...
   ✅ 麦克风访问已授权
   🔐 生成认证 URL (使用 Token)...
   🔐 使用 Token 认证方式
      AppID: 2111845224
      Token (前20字符): AKLTMjliZj...
   🔗 生成的 WebSocket URL (前80字符): wss://openspeech.bytedance.com/api/v3/realtime/dialogue?appid=2111845224&token=...
   🔌 正在连接到豆包 WebSocket...
   ✅ WebSocket 对象已创建，等待连接...
   ```

7. **如果连接成功**，会看到：
   ```
   ✅ WebSocket 连接已建立
   📤 已发送 StartConnection 事件
   📨 收到消息: ConnectionEstablished
   ```

8. **如果连接失败**，会看到：
   ```
   ❌ WebSocket 错误: ...
   🔌 WebSocket 连接已关闭
      状态码: 1006 (或其他)
      原因: ...
   ```

### 方法二：使用独立测试工具

1. **在浏览器中打开测试页面**
   ```bash
   open test-doubao-connection.html
   ```

2. **填写凭证**
   - App ID: `2111845224`
   - API Key: 您的完整 API Key
   - 认证方式: 选择 "Token 认证 (推荐)"

3. **点击"测试连接"**

4. **观察日志输出**
   - ✅ 成功: 应该看到 "ConnectionEstablished"
   - ❌ 失败: 状态码 1006 表示认证失败

5. **如果 Token 认证失败，尝试签名认证**
   - 认证方式: 选择 "签名认证 (备用)"
   - 填写 Secret Key
   - 再次点击"测试连接"

## 🔍 可能的问题和解决方案

### 问题 1: 主应用控制台没有任何输出

**原因**: Vite 没有加载环境变量

**解决方案**:
1. 确认 `.env` 文件在项目根目录
2. 确认文件名是 `.env` 而不是 `.env.txt`
3. 确认环境变量以 `VITE_` 开头
4. 重启开发服务器（必须！）

### 问题 2: WebSocket 状态码 1006 (Token 认证)

**原因**: Token 认证失败

**可能的解决方案**:
1. **检查 API Key 是否正确**
   - 从火山引擎控制台重新复制
   - 确保没有多余空格
   - 确保没有引号

2. **尝试使用签名认证**
   - 使用测试工具切换到"签名认证"
   - 使用 Secret Key 而不是 API Key

3. **检查 API 权限**
   - 登录火山引擎控制台
   - 确认已启用"端到端实时语音大模型"服务
   - 检查 App ID 对应的应用权限

4. **检查网络连接**
   - 确认可以访问 `openspeech.bytedance.com`
   - 检查防火墙或代理设置

### 问题 3: WebSocket 状态码 1008 (策略违规)

**原因**: API 使用权限不足

**解决方案**:
1. 登录火山引擎控制台
2. 检查应用配额和权限
3. 确认已开通对应服务

### 问题 4: 环境变量显示 MISSING

**原因**: `.env` 文件配置不正确

**解决方案**:
1. 检查 `.env` 文件内容：
   ```bash
   cat .env
   ```

2. 确保格式正确（无引号，无空格）：
   ```bash
   VITE_AI_PROVIDER=doubao
   VITE_DOUBAO_APP_ID=2111845224
   VITE_DOUBAO_API_KEY=AKLTMjliZj...
   VITE_DOUBAO_SECRET_KEY=WlRnMk56UT...
   ```

3. 重启开发服务器

## 📞 如何获取帮助

如果以上方法都无法解决问题，请提供：

1. **环境变量检查输出**
   ```bash
   node check-env.js
   ```

2. **浏览器控制台完整日志**
   - 从 "🔍 App mounted" 开始
   - 到连接失败的错误信息

3. **测试工具输出**
   - Token 认证的结果
   - 签名认证的结果（如果尝试了）

4. **WebSocket 关闭状态码和原因**

5. **火山引擎控制台截图**
   - App ID 信息
   - 服务权限状态

## 📚 相关资源

- [豆包端到端实时语音API文档](https://www.volcengine.com/docs/6561/1594356)
- [火山引擎控制台](https://console.volcengine.com/)
- [WebSocket 错误代码说明](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)

---

**最后更新**: 2025-12-26 23:30
